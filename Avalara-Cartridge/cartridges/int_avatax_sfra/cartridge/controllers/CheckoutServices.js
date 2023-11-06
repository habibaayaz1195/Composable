/**
 * Description of the Controller and the logic it provides
 *
 * @module  controllers/CheckoutServices
 */
 'use strict';

 var server = require('server');
 var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
 var LOGGER = require('dw/system/Logger').getLogger('Avalara');
 var avLogger = require('*/avLogger');
 var jsonLog;

 server.extend(module.superModule);

 server.append('PlaceOrder', 
    server.middleware.https, 
    function (req, res, next) {
        var resData = res.getViewData();

        if(resData && !resData.error){
            try{
                if(resData.orderID){
                    var orderObj = dw.order.OrderMgr.getOrder(resData.orderID);
                    var setInvc = require('~/cartridge/scripts/avaTax').calculateTaxAndCreateInvoice(orderObj, resData.orderID);
                }else{
                    LOGGER.warn('AvaTax | Order ID was not found. Invoice cannot be generated. File - CheckoutServices.js');
                    jsonLog = {
                        source: 'tax',
                        operation: 'CreateInvoice',
                        message: 'Cannot generate invoice as Order ID was not found. File - CheckoutServices.js',
                        logType: 'Debug',
                        logLevel: 'Exception',
                        functionName: 'CheckoutServices.js-PlaceOrder'
                    };
                    avLogger.avConfigDebugLogs(jsonLog);
                }
            }
            catch (e) {
                LOGGER.warn('AvaTax | An exception occurred while placing Invoice. File - CheckoutServices.js | ' + e.message);
            }
        }
        else{
            var message = resData ? (resData.error ? 'Storefront Error Message: ' + resData.errorMessage : '') : '';
            LOGGER.warn('AvaTax | Error in checkout process. Invoice cannot be generated. File - CheckoutServices.js | ' + message);
            jsonLog = {
                source: 'tax',
                operation: 'CreateInvoice',
                message: 'Error in storefront checkout process. Invoice cannot be generated. File - CheckoutServices.js | ' + message,
                logType: 'Debug',
                logLevel: 'Exception',
                functionName: 'CheckoutServices.js-PlaceOrder'
            };
            avLogger.avConfigDebugLogs(jsonLog);
        }
        return next();
    });

module.exports = server.exports();