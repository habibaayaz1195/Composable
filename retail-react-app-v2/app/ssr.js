/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable @typescript-eslint/no-var-requires */
'use strict'

const path = require('path')
const { getRuntime, json } = require('@salesforce/pwa-kit-runtime/ssr/server/express')
const { isRemote } = require('@salesforce/pwa-kit-runtime/utils/ssr-server')
const { getConfig } = require('@salesforce/pwa-kit-runtime/utils/ssr-config')
const getTran = require('./model/createTransactionModel')
const helmet = require('helmet')
const app = require("../config/default")
var Avatax = require('avatax');
var bodyParser = require('body-parser')
const axios = require('axios');
function padTo2Digits(num) {
    return num.toString().padStart(2, '0');
}

function formatDate(date) {
    return [
        date.getFullYear(),
        padTo2Digits(date.getMonth() + 1),
        padTo2Digits(date.getDate()),
    ].join('-');
}
// function getTransaction(basket) {
//     // this.date= "2023-07-22"
//     this.customerCode = basket.customerInfo.customerNo;
//     this.quantity = basket.productItems.quantity;
//     this.description = basket.productItems.productName;
//     this.companyCode = 'DEFAULTS';
//     this.salespersonCode = '';
//     this.customerUsageType = '';
//     this.discount = '';
//     this.purchaseOrderNo = '';
//     this.exemptionNo = '';
//     this.addresses = null;
//     this.parameters = null;
//     this.referenceCode = '';
//     this.reportingLocationCode = '';
//     this.commit = false;
//     this.batchCode = '';
//     this.taxOverride = null;
//     this.currencyCode = basket.currency;


// }
//Admin APIs
const SFCC_OAUTH_CLIENT_ID = '7590d328-8851-42e1-9f78-40124fb22daf';
const SFCC_OAUTH_CLIENT_SECRET = 'Cyber@June23';

const SFCC_CREDENTIALS = `${SFCC_OAUTH_CLIENT_ID}:${SFCC_OAUTH_CLIENT_SECRET}`;

const SFCC_REALM_ID = 'zzkc';
const SFCC_INSTANCE_ID = '009';

const SFCC_OAUTH_SCOPES = 'sfcc.products sfcc.products.rw';

// URLs
const access_token_url = 'https://account.demandware.com/dwsso/oauth2/access_token';
const options = {
    // The build directory (an absolute path)
    buildDir: path.resolve(process.cwd(), 'build'),

    // The cache time for SSR'd pages (defaults to 600 seconds)
    defaultCacheTimeSeconds: 600,

    // This is the value of the 'mobify' object from package.json
    mobify: getConfig(),

    // The port that the local dev server listens on
    port: 3000,

    // The protocol on which the development Express app listens.
    // Note that http://localhost is treated as a secure context for development.
    protocol: 'http'
}

const runtime = getRuntime()

const { handler } = runtime.createHandler(options, (app) => {
    // Set HTTP security headers
    app.use(
        helmet({
            contentSecurityPolicy: {
                useDefaults: true,
                directives: {
                    'img-src': ["'self'", '*.commercecloud.salesforce.com', 'data:','https://zzkc-009.dx.commercecloud.salesforce.com/on/demandware.static/-/Library-Sites-RefArchSharedLibrary/default*'],
                    'script-src': ["'self'", "'unsafe-eval'", 'storage.googleapis.com'],
                    'connect-src': ["'self'", 'api.cquotient.com'],

                    // Do not upgrade insecure requests for local development
                    'upgrade-insecure-requests': isRemote() ? [] : null
                }
            },
            hsts: isRemote()
        })
    )

    // Handle the redirect from SLAS as to avoid error
    app.get('/callback?*', (req, res) => {
        // This endpoint does nothing and is not expected to change
        // Thus we cache it for a year to maximize performance
        res.set('Cache-Control', `max-age=31536000`)
        res.send()
    })

    app.post("/pd-webhook", bodyParser.json(), async (req, res) => {
        const data = req.body.product;
        console.log( data)
    

        // Handle the event
    
           

            await axios.post(access_token_url,
                new URLSearchParams({
                    'grant_type': 'client_credentials',
                    'scope': `SALESFORCE_COMMERCE_API:${SFCC_REALM_ID}_${SFCC_INSTANCE_ID} ${SFCC_OAUTH_SCOPES}`
                }), {
                auth: {
                    username: SFCC_OAUTH_CLIENT_ID,
                    password: SFCC_OAUTH_CLIENT_SECRET
                }
            })
                .then(async (res) => {
                    console.log(res.data.access_token);

                    let access_token = res.data.access_token;

                    let organizationID = 'f_ecom_zzkc_009';
                    let shortCode = 'kv7kzm78';
                    let siteId = 'RefArch';

                 

                    const headers = {
                        'content-type': 'application/json',
                        'Authorization': `Bearer ${access_token}`
                    }

                    const params = {
                        'siteId': siteId,
                        'productIds': data
                    }

                    await axios.get(
                        
                        `https://${shortCode}.api.commercecloud.salesforce.com/product/shopper-products/v1/organizations/${organizationId}/products?ids=${productIds}&siteId=${siteId}`,
                        {
                            'status': 'confirmed'
                        },
                        {
                            params: params,
                            headers: headers
                        }).then((res) => {
                            console.log(res.data);
                        }).catch((err) => {
                            console.log(err.message +"error")
                        });

                    

                    

                   

                })
                .catch((err) => {
                    console.log(err.message)
                });

            ;
           

        // Return a 200 response to acknowledge receipt of the event
        res.send();
    });
    app.post('/create', bodyParser.json(), (req, res) => {
        const data = req.body;
        console.log(data)


        const config = {
            appName: 'retail-react-app-v2',
            appVersion: '1.0',
            environment: 'production',
            machineName: 'mbp',
            timeout: 5000,  // optional, default 20 mins
            logOptions: {
                logEnabled: true, // toggle logging on or off, by default its off.
                logLevel: 3, 	// logLevel that will be used, Options are LogLevel.Error (0), LogLevel.Warn (1), LogLevel.Info (2), LogLevel.Debug (3)
                logRequestAndResponseInfo: true, 	// Toggle logging of the request and response bodies on and off.
                //logger: myCustomLogger 	// (OPTIONAL) Custom logger can be passed in that implements the BaseLogger interface (e.g. debug, info, warn, error, and log functions) Otherwise console.log/error etc will be used by default.
            },
            // customHttpAgent: new https.Agent({keepAlive: true}) 	// (OPTIONAL) Define a custom https agent, import https from node to use this constructor. See https://node.readthedocs.io/en/latest/api/https/#https_class_https_agent for more information.
        };

        const creds = {
            username: 'asiflala@royalcyber.com',
            password: 'SunriseAve@2023'
        };
        var client = new Avatax(config).withSecurity(creds);
        console.log(client)
     
  const address = { 
    line1:data.address1,
    city: data.city, 
    postalCode: data.postalCode, 
    region: data.stateCode,
    country: data.countryCode 
  }; 
   
  return client.resolveAddress(address) 
    .then(result => { 
      // address validation result 
      console.log(result); 
      res.send(result)
    }); 

    })
   
  
    app.get('/robots.txt', runtime.serveStaticFile('static/robots.txt'))
    app.get('/favicon.ico', runtime.serveStaticFile('static/ico/favicon.ico'))

    app.get('/worker.js(.map)?', runtime.serveServiceWorker)
    app.get('*', runtime.render)
})
// SSR requires that we export a single handler function called 'get', that
// supports AWS use of the server that we created above.
exports.get = handler
