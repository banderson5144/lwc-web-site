if (process.env.NODE_ENV !== 'production') require('dotenv').config()

// Simple Express server setup to serve the build output
const compression = require('compression');
const helmet = require('helmet');
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const jsforce = require('jsforce');

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;

const app = express();
app.use(cookieParser());
app.use(helmet());
app.use(compression());

const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 3001;
const DIST_DIR = './dist';

app.use(express.static(DIST_DIR));

// //
// // Get authorization url and redirect to it.
// //
app.get('/oauth2/auth', function(req, res) {
    var isSandbox = req.query.isSandbox === 'true';
    res.redirect(`https://${isSandbox?'test':'login'}.salesforce.com/services/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${isSandbox?'test':'login'}`);
});

app.get('/oauth2/callback', function(req, res) {
    
    let oauth2 = new jsforce.OAuth2({
        // you can change loginUrl to connect to sandbox or prerelease env.
        loginUrl : `https://${req.query.state}.salesforce.com`,
        clientId : clientId,
        clientSecret : clientSecret,
        redirectUri : redirectUri
    });

    let conn = new jsforce.Connection({ oauth2 : oauth2, version: '50.0' });
    
    let code = req.query.code;
    conn.authorize(code, function(err, userInfo) {
        if (err) { return console.error(err); }        
    }).then(uRes =>{
        res.cookie('mySess',conn.accessToken);
        res.cookie('myServ',conn.instanceUrl);
        res.redirect('/?success=true');
    });
});

app.get('/getcounts',function(req,res){
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

app.get('/*', (req, res) => {
    console.log('should get here');
    res.sendFile(path.resolve(DIST_DIR, 'index.html'));
});

app.listen(PORT, () =>
    console.log(`✅  Server started: http://${HOST}:${PORT}`)
);
