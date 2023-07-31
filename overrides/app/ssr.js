/*
 * Copyright (c) 2023, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable @typescript-eslint/no-var-requires */
'use strict'

const path = require('path')
const {getRuntime} = require('@salesforce/pwa-kit-runtime/ssr/server/express')
const {isRemote} = require('@salesforce/pwa-kit-runtime/utils/ssr-server')
const {getConfig} = require('@salesforce/pwa-kit-runtime/utils/ssr-config')
const helmet = require('helmet')
var Avatax = require('avatax');
var bodyParser = require('body-parser')

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

const {handler} = runtime.createHandler(options, (app) => {
    // Set HTTP security headers
    app.use(
        helmet({
            contentSecurityPolicy: {
                useDefaults: true,
                directives: {
                    'img-src': ["'self'", '*.commercecloud.salesforce.com', 'data:'],
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
        res.send()
    })
    app.get('/robots.txt', runtime.serveStaticFile('static/robots.txt'))
    app.get('/favicon.ico', runtime.serveStaticFile('static/ico/favicon.ico'))
   //Avalara server-side end point
   app.post('/create',bodyParser.json(), (req, res) => {
    const data =req.body;
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
    //console.log(client)
    const taxDocument = {
        type: 'SalesInvoice',
        companyCode: 'DEFAULTS',
        date: formatDate(new Date(data.creationDate)),
        customerCode:  "Default",
        purchaseOrderNo: '2017-04-12-001',
       
        //hard-coded address
        addresses: {
            // SingleLocation: {
            //     line1: "2000 Main Street",
            //     city: "Irvine",
            //     region: "CA",
            //     country: "US",
            //     postalCode: "92614"
            // }
            SingleLocation: {
                line1: data.shipments[0].shippingAddress.address1,
                city: data.shipments[0].shippingAddress.city,
                region: data.shipments[0].shippingAddress.stateCode,
                country: data.shipments[0].shippingAddress.countryCode,
                postalCode: data.shipments[0].shippingAddress.postalCode
            }
        },
        lines: [
            {
               
                quantity: 1,
                amount: data.productSubTotal,
               
                description: "Dummy",

            }
        ],
        commit: true,
        currencyCode: 'USD',
        description: data.productItems[0].productName,
    }
    
     client.createTransaction({ model: taxDocument })
.then(result => {
  res.send(result)
  
});
   
})
    app.get('/worker.js(.map)?', runtime.serveServiceWorker)
    app.get('*', runtime.render)
})
// SSR requires that we export a single handler function called 'get', that
// supports AWS use of the server that we created above.
exports.get = handler
