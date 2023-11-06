'use strict';

// API includes
var Status = require('dw/system/Status');
var Money = require('dw/value/Money');

// script includes
var AvaTax = require('*/cartridge/scripts/avaTax');
var bevAlcShipmentHelper = require('*/cartridge/scripts/helpers/avatax/bevAlcShipmentHelper');
var calculateTaxHelper = require('*/cartridge/scripts/helpers/avatax/calculateTaxHelper');
var bevAlcConf = require('*/cartridge/scripts/avaBevAlcConf.json');

// Logger includes
var LOGGER = require('dw/system/Logger').getLogger('Avalara', 'AvaTax');

// AvaTax setting preference
var settingsObject = JSON.parse(require('dw/system/Site').getCurrent().getCustomPreferenceValue('ATSettings'));

/**
 * Creates an order and send it across to AvaTax service to be recorded.
 * @returns {string} order number
 */
exports.createOrderNo = function () {
	try {
		var basket = require('dw/order/BasketMgr').currentBasket;
		var orderNo = require('dw/order/OrderMgr').createOrderSequenceNo();

		AvaTax.calculateTax(basket, orderNo);

		return orderNo;
	} catch (e) {
		LOGGER.warn('Error while generating order no. File - avataxhooks.js | ' + e.message);
		if (!empty(e.javaName) && e.javaName == 'CreateException') {
			throw e;
		}
		return new Status(Status.ERROR);
	}
};
exports.validateShippingAddress=function (basket) {
	try {
		var svcResponse = null;
		// build an addressvalidationinfo object
		var validateAddress = new AddressValidationInfo();
		validateAddress.textCase = 'Mixed';
		validateAddress.line1 = basket.shipments[0].shippingAddress.address1 || '';
		validateAddress.line2 = basket.shipments[0].shippingAddress.address2 || '';
		//validateAddress.line3 = address.address3 || '';
		validateAddress.city = basket.shipments[0].shippingAddress.city || '';
		validateAddress.region = basket.shipments[0].shippingAddress.stateCode || '';
		validateAddress.postalCode = basket.shipments[0].shippingAddress.postalCode || '';
		if (!empty(basket.shipments[0].shippingAddress.countryCode.value)) {
			validateAddress.country = basket.shipments[0].shippingAddress.countryCode.value || 'us';
		} else {
			validateAddress.country = basket.shipments[0].shippingAddress.countryCode || 'us';
		}
		// Make sure an address was provided
		if (empty(validateAddress)) {
			LOGGER.warn('AvaTax | No address provided. File - AvaTax.js');
			// Log to logentries //
			jsonLog = {
				source: 'tax',
                operation: 'ResolveAddress',
                message: 'Can not validate address since Address object is empty.',
                logType: 'Debug',
                logLevel: 'Exception',
                functionName: 'avaTax.js-validateShippingAddress'
			};
			avLogger.avConfigDebugLogs(jsonLog);
			// ------------------------------- //
			return new Status(Status.ERROR);
		}
		var country = !empty(validateAddress.country) ? validateAddress.country : '';
		// countries for address validation - to be changed for Global implementation
		var countries = ['us', 'usa', 'canada'];
		if (countries.indexOf(country.toString().toLowerCase()) === -1) {
			LOGGER.warn('AvaTax | Can not validate address for this country {0}. File - AvaTax.js', country);
			// Log to logentries //
			jsonLog = {
				source: 'tax',
                operation: 'ResolveAddress',
                message: 'Can not validate address since country - \'' + country + '\' not configured in site preferences.',
                logType: 'Debug',
                logLevel: 'Exception',
                functionName: 'avaTax.js-validateShippingAddress'
			};
			avLogger.avConfigDebugLogs(jsonLog);
			// ------------------------------- //
			return new Status(Status.ERROR);
		}
		// Service call
		svcResponse = avaTaxClient.resolveAddressPost(validateAddress);
		return svcResponse;
	} catch (e) {
		LOGGER.warn('AvaTax | AvaTax Can not validate address at the moment. AvaTax.js~validateShippingAddress '+ e.message);
		// Log to logentries //
		jsonLog = {
			source: 'tax',
			operation: 'ResolveAddress',
			message: 'ValidateAddress failed. ' + e.message,
			logType: 'Debug',
			logLevel: 'Exception',
			functionName: 'avaTax.js-validateShippingAddress'
		};
		avLogger.avConfigDebugLogs(jsonLog);
		// ------------------------------- //
		return {
			statusCode: 'validateShippingAddressMethodFailed',
			message: e.message,
			error: true
		};
	}
}
/**
 * Calculates the taxes by contacting AvaTax service
 * @param {Object} basket dw.basket object
 * @returns {*} void
 */
exports.calculateTax = function (basket) {
	// default tax calculation, if AvaTax not enabled
	if (!settingsObject.taxCalculation) {
		LOGGER.warn('AvaTax tax calculation not enabled. Default tax calculation will be executed. File - avataxhooks.js~calculateTax');
		require('*/cartridge/scripts/hooks/cart/calculate').calculateTax(basket);
	} else {
		try {
			if (!empty(basket.defaultShipment) && !empty(basket.defaultShipment.shippingAddress)) {
				AvaTax.calculateTax(basket);
			} else {
				var lineItems = basket.getAllLineItems();
				var itemTax = new Money(0, basket.currencyCode);
				if (lineItems.length > 0) {
					for (var i = 0; i < lineItems.length; i++) {
						var lineItem = lineItems[i];
						lineItem.setTax(itemTax);
						lineItem.updateTax(0.00);
					}
				}
			}
			return new Status(Status.OK);
		} catch (e) {
			LOGGER.warn('Error while calculating the taxes. File - avataxhooks.js~calculateTax | ' + e.message);
			return new Status(Status.ERROR);
		}
	}
	return new Status(Status.OK);
};

/**
 * Reverify the BevAlc Shipment
 * @param {object} params contains order no and other params
 * @returns {*} void
 */
 exports.reverify = function ( params ) {

	var orderNo, isOverride, basket;
	if(params) {
		orderNo = params['orderNo'];
		isOverride = params['isOverride'];
		basket = params['basket'];
	}

	// Checking Avatax and Bev Alc Subscription
	if (!settingsObject.taxCalculation || !calculateTaxHelper.verifyBevAlcEnabled()) {

		LOGGER.warn('AvaTax tax calculation not enabled or Bev Alc Subscription not enabled. No action will be executed. File - avataxhooks.js~reverify');

	} else {

		try {

			var responseObj;
			if(!empty(orderNo)) responseObj = bevAlcShipmentHelper.registerOrOverrideShipment(basket, orderNo, isOverride);

			if(responseObj && responseObj.ERROR) {
				LOGGER.warn('Error while Reverifying Shipment. File - avataxhooks.js~reverify | ' + responseObj.msg);
				return new Status(Status.ERROR);
			}

		} catch (e) {
			LOGGER.warn('An exception occurred while Reverifying Shipment. File - avataxhooks.js~reverify | ' + e.message);
			return new Status(Status.ERROR);
		}
	}

	return new Status(Status.OK);
};

/**
 * Cancel Or Delete the BevAlc Shipment
 * @param {object} params contains order no and other params
 * @returns {*} void
 */
 exports.cancelOrDeleteShipment = function (params) {

	var orderNo, deleteShipment;
	if(params) {
		orderNo = params['orderNo'];
		deleteShipment = params['deleteShipment'];
	}

	// Checking Avatax and Bev Alc Subscription
	if (!settingsObject.taxCalculation || !calculateTaxHelper.verifyBevAlcEnabled()) {

		LOGGER.warn('AvaTax tax calculation not enabled or Bev Alc Subscription not enabled. No action will be executed. File - avataxhooks.js~reverify');

	} else {

		try {

			var responseObj;
			if(!empty(orderNo)) responseObj = bevAlcShipmentHelper.cancelOrder(orderNo, deleteShipment);

			if(responseObj && responseObj.ERROR) {
				LOGGER.warn('Error while Cancelling Shipment. File - avataxhooks.js~reverify | ' + responseObj.msg);
				return new Status(Status.ERROR);
			}

		} catch (e) {
			LOGGER.warn('An exception occurred while Cancelling Shipment. File - avataxhooks.js~reverify | ' + e.message);
			return new Status(Status.ERROR);
		}
	}

	return new Status(Status.OK);
};

/**
 * Provides Default Bev Alc Configuration
 * @param {string} productID is a product id
 * @returns {*} void
 */
 exports.fetchBevAlcConfiguration = function (productID) {
	var bevAlcAttributes;

	if(productID && bevAlcConf[productID]) {
		bevAlcAttributes = JSON.parse(JSON.stringify(bevAlcConf[productID]));
	}

	return bevAlcAttributes;
};