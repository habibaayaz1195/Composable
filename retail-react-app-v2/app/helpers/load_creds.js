  // es5 import
  var Avatax = require('avatax');
        
  // es6/7 import
  // import Avatax from 'avatax';
  
  // resolve configuration and credentials
  const config = {
    appName: 'retail-react-app-v2',
    appVersion: '1.0',
    environment: 'sandbox',
    machineName: 'mbp',
    timeout: 5000,  // optional, default 20 mins
    logOptions: {
        logEnabled: true, // toggle logging on or off, by default its off.
        logLevel: 3, 	// logLevel that will be used, Options are LogLevel.Error (0), LogLevel.Warn (1), LogLevel.Info (2), LogLevel.Debug (3)
        logRequestAndResponseInfo: true, 	// Toggle logging of the request and response bodies on and off.
        logger: myCustomLogger 	// (OPTIONAL) Custom logger can be passed in that implements the BaseLogger interface (e.g. debug, info, warn, error, and log functions) Otherwise console.log/error etc will be used by default.
    },
    customHttpAgent: new https.Agent({keepAlive: true}) 	// (OPTIONAL) Define a custom https agent, import https from node to use this constructor. See https://node.readthedocs.io/en/latest/api/https/#https_class_https_agent for more information.
  };
  
  const creds = {
    username: 'habiba.ayaz@royalcyber.com',
    password: 'CyberR@12345'
  };
  
  var client = new Avatax(config).withSecurity(creds);

  const taxDocument = {
    type: 'SalesInvoice',
    companyCode: 'abc123',
    date: '2017-04-12',
    customerCode: 'ABC',
    purchaseOrderNo: '2017-04-12-001',
    addresses: {
      SingleLocation: {
        line1: '123 Main Street',
        city: 'Irvine',
        region: 'CA',
        country: 'US',
        postalCode: '92615'
      }
    },
    lines: [
      {
        number: '1',
        quantity: 1,
        amount: 100,
        taxCode: 'PS081282',
        itemCode: 'Y0001',
        description: 'Yarn'
      }
    ],
    commit: true,
    currencyCode: 'USD',
    description: 'Yarn'
  }
  
  return client.createTransaction({ model: taxDocument })
    .then(result => {
      // response tax document
      console.log(result);
    });