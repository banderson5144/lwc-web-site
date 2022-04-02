if (process.env.NODE_ENV !== 'production') require('dotenv').config()

// Simple Express server setup to serve the build output
const compression = require('compression');
const helmet = require('helmet');
const express = require('express');
const cookieParser = require('cookie-parser');
const jsforce = require('jsforce');
const https = require('https');

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;

const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 3001;
const DIST_DIR = './dist';

const app = express();
app.disable('etag');
app.use(cookieParser());
app.use(helmet({
    contentSecurityPolicy:{
        useDefaults:true,
        directives:{
            connectSrc:["'self'","https://*.my.salesforce.com"]
        }
    }
}));
app.use(compression());

app.use(express.static(DIST_DIR));

// //
// // Get authorization url and redirect to it.
// //
app.get('/oauth2/auth', function(req, res)
{
    var isSandbox = req.query.isSandbox === 'true';
    res.redirect(`https://${isSandbox?'test':'login'}.salesforce.com/services/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${isSandbox?'test':'login'}`);
});

app.get('/oauth2/callback', function(req, res)
{    
    let oauth2 = new jsforce.OAuth2(
    {
        // you can change loginUrl to connect to sandbox or prerelease env.
        loginUrl : `https://${req.query.state}.salesforce.com`,
        clientId : clientId,
        clientSecret : clientSecret,
        redirectUri : redirectUri
    });

    let conn = new jsforce.Connection({ oauth2 : oauth2, version: '50.0' });
    
    let code = req.query.code;
    conn.authorize(code)
    .then(uRes =>
    {
        console.log('first response');
        console.log(process.env.REDIRECT_URI);
        let corsUrl = new URL(process.env.REDIRECT_URI);
        console.log(corsUrl.origin);
        let metadata = [{
            fullName: 'HerokuTest',
            urlPattern: corsUrl.origin
        }];
        conn.metadata.upsert('CorsWhitelistOrigin', metadata)
        .then(mRes =>{
            console.log('getting here success');
            console.log(mRes);
            console.log(conn.accessToken);
            console.log(conn.instanceUrl);
            res.cookie('mySess',conn.accessToken, {maxAge:900000});
            res.cookie('myServ',conn.instanceUrl, {maxAge:900000});
            res.redirect('/?success=true');
        })
        .catch(err =>{
            console.log(err);
            console.log('getting here error');
            console.log(conn.accessToken);
            console.log(conn.instanceUrl);
            res.cookie('mySess',conn.accessToken);
            res.cookie('myServ',conn.instanceUrl);
            res.redirect('/?success=true');
        });
    });
});

app.get('/getcoverage',function(req,res)
{
    var sfRes = {};

    var conn = new jsforce.Connection({sessionId:req.cookies.mySess,serverUrl:req.cookies.myServ});

    conn.tooling.query('Select ApexTestClass.Name,'+
                        'ApexClassorTrigger.Name,'+
                        'NumLinesCovered,'+
                        'NumLinesUncovered '+
                        'From ApexCodeCoverage')
    .then(qryRes => {
        sfRes.codeCov = qryRes;
        return conn.tooling.query('Select PercentCovered From ApexOrgWideCoverage');
    })
    .then(orgCovRes => {
        sfRes.orgCov = orgCovRes;
        res.send(JSON.stringify(sfRes));
    });
});

app.get('/getcounts',function(req,res)
{
    var conn = new jsforce.Connection({sessionId:req.cookies.mySess,serverUrl:req.cookies.myServ});

    let _request = {
        url: '/services/data/v51.0/limits/recordCount',
        method: 'GET'
     };
     
     conn.request(_request, function(err, resp)
     {
        if(err)
        {
            console.log(err);
        }
        res.send(resp);
     });
});

app.get('/bulkquery',function(req,res)
{
    console.log(req.query.sfqry);

    const url = new URL(req.cookies.myServ);
    console.log(url.hostname);

    const data = JSON.stringify({
        "operation": "query",
        "query": req.query.sfqry
    });

    const options = {
        hostname: url.hostname,
        port: 443,
        path: '/services/data/v54.0/jobs/query',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer '+req.cookies.mySess,
            'Content-Type': 'application/json'
        }
    };

    const httpsReq = https.request(options, httpRes => {
        let body = "";

        httpRes.on("data", (chunk) => {
            body += chunk;
        });

        httpRes.on("end", () => {
            try {
                let json = JSON.parse(body);
                console.log(json);
                res.send(json);
            } catch (error) {
                console.error(error.message);
            }
        });
    });

    httpsReq.on('error', error => {
        console.error(error)
    });

    httpsReq.write(data);
    httpsReq.end();
});

app.get('/logout',async function(req,res)
{
    var conn = new jsforce.Connection({sessionId:req.cookies.mySess,serverUrl:req.cookies.myServ});
    
    await conn.logout();
    
    res.clearCookie('mySess');
    res.clearCookie('myServ');
    res.redirect('/');
});

app.listen(PORT, () =>
    console.log(`✅  Server started: http://${HOST}:${PORT}`)
);