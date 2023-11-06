'use strict';

var Status = require('dw/system/Status');

exports.afterPUT = function (basket) {
    
    // const HookMgr = require('dw/system/HookMgr');
    // HookMgr.callHook("dw.ocapi.shop.basket.items.afterPOST", "validateShippingAddress", basket);
    return new Status(Status.OK);
}
