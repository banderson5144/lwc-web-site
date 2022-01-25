if (process.env.NODE_ENV !== 'production') require('dotenv').config()

// Simple Express server setup to serve the build output
const compression = require('compression');
const helmet = require('helmet');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const jsforce = require('jsforce');

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;

const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 3001;
const DIST_DIR = './dist';

const app = express();
app.use(cookieParser());
app.use(helmet());
app.use(compression());
app.use(cors());

app.use(express.static(DIST_DIR,{
    etag: false
}));

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
        console.log(process.env.REDIRECT_URI);
        let corsUrl = new URL(process.env.REDIRECT_URI);
        console.log(corsUrl.origin);
        let metadata = [{
            fullName: 'HerokuTest',
            urlPattern: corsUrl.origin
        }];
        conn.metadata.upsert('CorsWhitelistOrigin', metadata)
        .then(mRes =>{
            console.log(mRes);
            console.log(conn.accessToken);
            console.log(conn.instanceUrl);
            res.cookie('mySess',conn.accessToken);
            res.cookie('myServ',conn.instanceUrl);
            res.set('Content-Security-Policy', 'connect-src '+conn.instanceUrl);
            res.redirect('/?success=true');
        })
        .catch(err =>{
            console.log(err);
            console.log(conn.accessToken);
            console.log(conn.instanceUrl);
            res.cookie('mySess',conn.accessToken);
            res.cookie('myServ',conn.instanceUrl);
            res.set('Content-Security-Policy', 'connect-src '+conn.instanceUrl);
            res.redirect('/?success=true');
        });
        // res.cookie('mySess',conn.accessToken);
        // res.cookie('myServ',conn.instanceUrl);
        // res.redirect('/?success=true');
    });
});

app.get('/getcounts',function(req,res)
{
    var conn = new jsforce.Connection({sessionId:req.cookies.mySess,serverUrl:req.cookies.myServ});

    let _request = {
        url: '/services/data/v51.0/limits/recordCount',
        method: 'GET'
     };
     
     conn.request(_request, function(err, resp) {
        if(err)
        {
            console.log(err);
        }
        res.send(resp);
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

app.use(function(req, res, next)
{
    req.headers['if-none-match'] = 'no-match-for-this';
    next();    
});

app.use(function (req, res, next)
{
    console.log(req.url);
    if (req.url === '/')
    {
        console.log('Should set CSP');
        console.log(req.cookies.myServ);
        res.set('Content-Security-Policy', 'connect-src '+req.cookies.myServ);
    }
    next();
});

app.use('*', (req, res) =>
{
    res.sendFile(path.resolve(DIST_DIR, 'index.html'));
});

app.listen(PORT, () =>
    console.log(`✅  Server started: http://${HOST}:${PORT}`)
);