
'use strict';

var Status = require('dw/system/Status');
var dworder = require('dw/order');
var dwStringUtils = require('dw/util').StringUtils;
var dwvalue = require('dw/value');
var dwlogger = require('dw/system/Logger');
var dwsite = require('dw/system/Site');
var SortedMap = require('dw/util/SortedMap');
var Decimal = require('dw/util/Decimal');

// script includes
var avaTaxClient = require('*/cartridge/scripts/avaTaxClient');
var jsonAddress = require('*/cartridge/scripts/lineLevelAddress.json');
var merchantDetails = require('*/cartridge/scripts/avaMerchantConf.json');

// Model includes
var AddressValidationInfo = require('*/cartridge/models/addressValidationInfo');
var CreateTransactionModel = require('*/cartridge/models/createTransactionModel');

// Logger includes
var LOGGER = dwlogger.getLogger('Avalara', 'AvaTax');

// AvaTax setting preference
var settingsObject = JSON.parse(dwsite.getCurrent().getCustomPreferenceValue('ATSettings'));

var customerTaxId = !empty(customer.profile) ? customer.profile.taxID : null; // Tax ID of the customer
var taxationpolicy;
var defaultProductTaxCode = 'P0000000';
var defaultShippingMethodTaxCode = settingsObject.defaultShippingMethodTaxCode || 'FR';
var taxIncluded;

//global variables
var uuidLineNumbersMap;
var lineIdShipmentIdMap;
var shipmentIdShipfromMap;
var counter;
var lines=[];
var shippingAddress;
var isMultipleShipTo = false;

/**
 * Extracts all line items in the Basket
 * @param {dw.order.Basket} basket  `Basket` object
 * @returns An array of `dw.order.LineItem`
 */
var getAllLineItems = function (basket) {
    uuidLineNumbersMap = new SortedMap();
    lineIdShipmentIdMap = new SortedMap();
    shipmentIdShipfromMap = new SortedMap();
    counter = 0;
    taxationpolicy = settingsObject.taxationpolicy.toString();
    taxIncluded = taxationpolicy === 'net' ? false : true;
    return {
        lines: getProductLineItems(basket).concat(getShippingLineItems(basket)).concat(getGiftCertificateLineItems(basket)),
        uuidLineNumbersMap: uuidLineNumbersMap,
        lineIdShipmentIdMap: lineIdShipmentIdMap
    };
};

/**
 * Extracts all product line items from the Basket
 * @param {dw.order.Basket} basket Basket object
 * @returns An array of product line items
 */
function getProductLineItems(basket){

    var pliIterator = basket.productLineItems.iterator();
    lines = [];

    while (pliIterator.hasNext()) {
        var li = pliIterator.next();

        if (!empty(li.shipment.shippingAddress)) {

            var prodID = li.productID;
            var shippingAddress = li.shipment.shippingAddress;
            var shipToAddress;
            var shipFromAddress = getAddressModelFromSettingsObject();

            // create a line item and push it to lines array
            var line = new CreateTransactionModel.LineItemModel();

            //Search for line level ship from address for specific product
            line.merchantSellerIdentifier=null;
            if(!empty(jsonAddress.lladdresses[prodID])){
                if( jsonAddress.lladdresses[prodID].shipfrom && !empty(jsonAddress.lladdresses[prodID].shipfrom.line1) && !empty(jsonAddress.lladdresses[prodID].shipfrom.countryCode)){
                    shipFromAddress = getJsonShipFrom(jsonAddress.lladdresses[prodID].shipfrom);
                }

                if(!empty(jsonAddress.lladdresses[prodID].merchantId)) {
                    line.merchantSellerIdentifier = jsonAddress.lladdresses[prodID].merchantId;

                    if(merchantDetails[line.merchantSellerIdentifier] && !empty(merchantDetails[line.merchantSellerIdentifier].parameters)) {
                        line.parameters = JSON.parse(JSON.stringify(merchantDetails[line.merchantSellerIdentifier].parameters));
                    }
                }
                
                if(!empty(jsonAddress.lladdresses[prodID].transport)) {
                    line.parameters.push({
                        "name": "Transport",
                        "value": jsonAddress.lladdresses[prodID].transport
                });
                }
            }

            // Construct a shipTo addressLocationInfo object from shippingAddress
            shipToAddress = getAddressModelWithValues(shippingAddress);

            // Making maps for later use
            uuidLineNumbersMap.put((++counter).toString(), li.UUID); // assign an integer value
            lineIdShipmentIdMap.put(counter.toString(), (li.productID + '|' + li.shipment.ID)); // to store shipment id and tax details
            shipmentIdShipfromMap.put(li.shipment.ID, shipFromAddress);

            if(li.shipment.ID != 'me'){
                isMultipleShipTo=true;
            }

            line.number = counter;
            line.quantity = li.quantityValue || li.quantity;
            line.amount = li.proratedPrice.value;

            // addresses model
            line.addresses = new CreateTransactionModel.AddressesModel();
            line.addresses.shipFrom= null;
            line.addresses.shipFrom = shipFromAddress;
            line.addresses.shipTo = shipToAddress;
            line.addresses.pointOfOrderOrigin = basket.billingAddress ? getAddressModelWithValues(basket.billingAddress) : null;

            line.taxCode = !empty(li.getProduct().taxClassID) ? li.getProduct().taxClassID.toString() : defaultProductTaxCode;
            line.customerUsageType = null;
            line.itemCode = (!empty(li.product.UPC) ? ('UPC:' + li.product.UPC) : li.productName.toString()).substring(0, 50);
            line.exemptionCode = null;
            line.discounted = false;
            line.taxIncluded = taxIncluded;
            line.revenueAccount = null;
            line.ref1 = null;
            line.ref2 = null;
            line.description = !empty(li.product.shortDescription) ? li.product.shortDescription.source.toString().substring(0, 255) : '';
            line.businessIdentificationNo = customerTaxId;
            line.taxOverride = null;

            // Uncomment the code below to populate marketplaceLiabilityType and originationSite on product level 
            // See documentation for more info
            // line.marketplaceLiabilityType = "";
            // line.originationSite = "";

            //Check if customer is bev-alc registered
            if(verifyBevAlcEnabled()){
                // Bev Alc Feature
                var bevAlcAttributes = getBevAlcAttributesForLines(prodID);
                if(bevAlcAttributes) {

                    // Existing Conf parameters contains attributes like:
                    // AlcoholContent, ContainerSize, NetVolume, PackSize, IsAlcoholSample, IsForeignAlcohol, Brand
                    line.parameters = line.parameters.concat(bevAlcAttributes["parameters"]);
            
                    // Recipient Name
                    line.parameters.push({
                        "name":"RecipientName",
                        "value": shippingAddress.firstName + " " + shippingAddress.lastName
                    });

                    // Uncomment the code below to populate RecipientDOB on product level 
                    // See documentation for more info
                    // line.parameters.push({
                    //     "name":"RecipientDOB",
                    //     "value": ""
                    // });

                    // Tax Code Override
                    if(bevAlcAttributes["taxCode"]) {
                        line.taxCode = bevAlcAttributes["taxCode"];
                    }
                }
            }

            lines.push(line);

            // Pushing option products
            var oliIterator = li.optionProductLineItems.iterator();
            while (oliIterator.hasNext()) {
                // create a line item and push it to lines array
                var oli = oliIterator.next();
                var line = new CreateTransactionModel.LineItemModel();
                uuidLineNumbersMap.put((++counter).toString(), oli.UUID); // assign an integer value
                line.number = counter;
                lineIdShipmentIdMap.put(counter.toString(), (oli.optionID + '|' + oli.shipment.ID)); // to store shipment id and tax details
                line.quantity = oli.quantityValue || oli.quantity;
                line.amount = oli.proratedPrice.value;
                // Addresses model
                line.addresses = new CreateTransactionModel.AddressesModel();

                line.merchantSellerIdentifier=null;
                line.addresses.shipFrom = shipFromAddress;
                line.addresses.shipTo = shipToAddress;
                line.taxCode = !empty(oli.taxClassID) ? oli.taxClassID.toString() : defaultProductTaxCode;
                line.customerUsageType = null;
                line.itemCode = !empty(oli.productName) ? oli.productName.toString().substring(0, 50) : '';
                line.exemptionCode = null;
                line.discounted = false;
                line.taxIncluded = taxIncluded;
                line.revenueAccount = null;
                line.ref1 = null;
                line.ref2 = null;
                line.description = !empty(oli.productName) ? oli.productName.substring(0, 50) : '';
                line.businessIdentificationNo = customerTaxId;
                line.taxOverride = null;
                line.parameters = null;
                lines.push(line);
            }
            //pushing shipping line items
            if (!empty(li.shippingLineItem)) {
                // create a line item and push it to lines array
                var sli = li.shippingLineItem;
                var line = new CreateTransactionModel.LineItemModel();
                uuidLineNumbersMap.put((++counter).toString(), sli.UUID); // assign an integer value
                line.number = counter;
                lineIdShipmentIdMap.put(counter.toString(), (sli.shipment.ID + '|' + sli.shipment.ID)); // to store shipment id and tax details
                line.quantity = 1;
                line.amount = sli.adjustedPrice.value;
                // Addresse model
                line.addresses = new CreateTransactionModel.AddressesModel();
                line.addresses.shipFrom = shipFromAddress;
                line.addresses.shipTo = shipToAddress;
                line.taxCode = !empty(sli.taxClassID) ? sli.taxClassID.toString() : defaultShippingMethodTaxCode;
                line.customerUsageType = null;
                line.itemCode = !empty(sli.lineItemText) ? sli.lineItemText.toString().substring(0, 50) : 'shipping-line-item';
                line.exemptionCode = null;
                line.discounted = false;
                line.taxIncluded = taxIncluded;
                line.revenueAccount = null;
                line.ref1 = null;
                line.ref2 = null;
                line.description = !empty(sli.lineItemText) ? sli.lineItemText.toString().substring(0, 255) : 'shipping-line-item';
                line.businessIdentificationNo = customerTaxId;
                line.taxOverride = null;
                line.merchantSellerIdentifier=null;
                line.parameters = null;
                lines.push(line);
            }
        }
    }
    return lines;
}

/**
 * Returns all shipping line items from the basket
 * @param {dw.order.Basket} basket Basket object
 * @returns An array of shipping line items
 */
function getShippingLineItems(basket){
    lines=[];
    var shipmentsIterator = basket.shipments.iterator();
    while (shipmentsIterator.hasNext()) {
        var shipment = shipmentsIterator.next();
        if (!empty(shipment.shippingAddress)) {

            var shippingLineItemsIterator = shipment.shippingLineItems.iterator();

            while (shippingLineItemsIterator.hasNext()) {
                var li = shippingLineItemsIterator.next();
                var line = new CreateTransactionModel.LineItemModel();
                uuidLineNumbersMap.put((++counter).toString(), li.UUID); // assign an integer value
                line.number = counter;

                lineIdShipmentIdMap.put(counter.toString(), (shipment.ID + '|' + shipment.ID)); // to store shipment id and tax details
                var shipFromByID = shipmentIdShipfromMap.get(shipment.ID);
                line.quantity = 1;
                line.amount = li.adjustedPrice.value;
                // Addresse model
                shippingAddress = shipment.shippingAddress;
                line.addresses = new CreateTransactionModel.AddressesModel();

                line.addresses.shipFrom = getAddressModelFromSettingsObject();
                if(isMultipleShipTo){
                    if(shipFromByID){
                        line.addresses.shipFrom = shipFromByID;
                    }

                }
                if(shipmentIdShipfromMap.size() == 1){
                    line.addresses.shipFrom = shipFromByID;
                }
                // Construct a shipTo addressLocationInfo object from shippingAddress
                line.addresses.shipTo = getAddressModelWithValues(shippingAddress);
                line.taxCode = !empty(li.taxClassID) ? li.taxClassID.toString() : defaultShippingMethodTaxCode;
                line.customerUsageType = null;
                line.itemCode = !empty(li.ID) ? li.ID.toString().substring(0, 50) : 'shipping-line-item';
                line.exemptionCode = null;
                line.discounted = false;
                line.taxIncluded = taxIncluded;
                line.revenueAccount = null;
                line.ref1 = null;
                line.ref2 = null;
                line.description = !empty(li.lineItemText) ? li.lineItemText.toString().substring(0, 255) : 'shipping-line-item';
                line.businessIdentificationNo = customerTaxId;
                line.taxOverride = null;
                line.merchantSellerIdentifier=null;
                line.parameters = null;
                lines.push(line);
            }
        }
    }
    return lines;
}

/**
 * Returns all gift  certificate line items from Basket.
 * @param {*} basket Basket object
 * @returns An array of gift line items
 */
function getGiftCertificateLineItems(basket){
    lines=[];
    var giftCertLinesIterator = basket.giftCertificateLineItems.iterator();
    while (giftCertLinesIterator.hasNext()) {

        var giftCert = giftCertLinesIterator.next();
        var gs = giftCert.shipment;

        if (  (!empty(gs.shippingAddress))  ||  (!empty(basket.billingAddress))  ){

            var line = new CreateTransactionModel.LineItemModel();
            uuidLineNumbersMap.put((++counter).toString(), giftCert.UUID); // assign an integer value
            line.number = counter;
            lineIdShipmentIdMap.put(counter.toString(), (giftCert.giftCertificateID + '|' + giftCert.shipment.ID)); // to store shipment id and tax details
            line.quantity = 1;
            line.amount = giftCert.getPriceValue();
            // Addresse model
            line.addresses = new CreateTransactionModel.AddressesModel();
            line.addresses.shipFrom = getAddressModelFromSettingsObject();

            line.taxCode = 'PG050000'; // Default gift card tax code
            line.customerUsageType = null;
            line.itemCode = !empty(giftCert.lineItemText) ? giftCert.lineItemText.toString().substring(0, 50) : gs.giftCertificateID.toString() || 'gift-certificate';
            line.exemptionCode = null;
            line.discounted = false;
            line.taxIncluded = taxIncluded;
            line.revenueAccount = null;
            line.ref1 = null;
            line.ref2 = null;
            line.description = !empty(giftCert.lineItemText) ? giftCert.lineItemText.toString().substring(0, 255) : 'gift-certificate';
            line.businessIdentificationNo = customerTaxId;
            line.taxOverride = null;
            line.merchantSellerIdentifier=null;
            line.parameters = null;

            // Construct a shipTo addressLocationInfo object from shippingAddress
            var gsShipTo;
            if (!empty(gs.shippingAddress)) {
                gsShipTo = getAddressModelWithValues(gs.shippingAddress);
            } else {
                gsShipTo = getAddressModelWithValues(basket.billingAddress);
            }

            line.addresses.shipTo = gsShipTo;
            lines.push(line);
        }
    }
    return lines;
}

/**
 * Get information about AvaTax BevAlc subscriptions
 */
 function verifyBevAlcEnabled() {
    var isBevAlcEnabled = false;
	//If subscriptions value does not exist or is empty in settings object
	if(!(settingsObject["subscriptions"]) || settingsObject["subscriptions"].length ==0){
		//Retrieve subscribed services
		var svcResponse = null;
		svcResponse = avaTaxClient.getSubscriptions('', '', '', false);
		var services = [];
        
		if (svcResponse && svcResponse.value && svcResponse.value.length > 0) {
			for (var currService = 0; currService < svcResponse.value.length; currService++) {
				var svc = svcResponse.value[currService];
				services.push(svc.subscriptionDescription);
			}
		}
		settingsObject["subscriptions"] = services;
	}
	//Check settings object for BevAlc service
	if(settingsObject["subscriptions"].includes("AvaAlcohol")){
		isBevAlcEnabled = true;
	}
    return isBevAlcEnabled;

}

/**
 * Fetches line level shipfrom address from JSON file
 * @param {*} params shipfrom object for specific product ID
 * @returns {object} returns an object containing shipfrom address attributes
 */
function getJsonShipFrom(shipfrom){
	var jsonShipFrom = new CreateTransactionModel.AddressLocationInfo();
    jsonShipFrom.locationCode = '';
    jsonShipFrom.line1 =  shipfrom.line1 || '';
	jsonShipFrom.line2 =shipfrom.line2 || '';
	jsonShipFrom.line3 =  shipfrom.line3 || '';
	jsonShipFrom.city =  shipfrom.city || '';
	jsonShipFrom.region =  shipfrom.region || '';
	jsonShipFrom.postalCode =  shipfrom.postalCode || '';
	jsonShipFrom.country =  shipfrom.countryCode || '';
	jsonShipFrom.latitude = shipfrom.latitude || '';
	jsonShipFrom.longitude = shipfrom.longitude || '';

	return jsonShipFrom;
}

/**
 * Fetches and updates Gift line item shipTo address details
 * @returns {object} returns an object containing shipto address attributes
 */
 function getAddressModelWithValues(shippingAddressObj){
    // Update the shipTo addressLocationInfo object from shippingAddress object
    var shipToAddress = new CreateTransactionModel.AddressLocationInfo();
    shipToAddress.locationCode = '';
    shipToAddress.line1 = shippingAddressObj.address1;
    shipToAddress.line2 = shippingAddressObj.address2;
    shipToAddress.line3 = '';
    shipToAddress.city = shippingAddressObj.city;
    shipToAddress.region = shippingAddressObj.stateCode;
    shipToAddress.country = shippingAddressObj.countryCode.getDisplayValue().toString();
    shipToAddress.postalCode = shippingAddressObj.postalCode;
    shipToAddress.latitude = '';
    shipToAddress.longitude = '';
    return shipToAddress;
 }

/**
 * Fetches default shipfrom address from Avatax Settings page
 * @returns {object} returns an object containing shipfrom address attributes
 */
function getAddressModelFromSettingsObject(){
    // Construct a shipFrom addressLocationInfo object from preferences
    var aliShipFrom = new CreateTransactionModel.AddressLocationInfo();
    aliShipFrom.locationCode = !empty(settingsObject.locationCode) ? settingsObject.locationCode : '';
    aliShipFrom.line1 = !empty(settingsObject.line1) ? settingsObject.line1 : '';
    aliShipFrom.line2 = !empty(settingsObject.line2) ? settingsObject.line2 : '';
    aliShipFrom.line3 = !empty(settingsObject.line3) ? settingsObject.line3 : '';
    aliShipFrom.city = !empty(settingsObject.city) ? settingsObject.city : '';
    aliShipFrom.region = !empty(settingsObject.state) ? settingsObject.state : '';
    aliShipFrom.postalCode = !empty(settingsObject.zipCode) ? settingsObject.zipCode : '';
    aliShipFrom.country = !empty(settingsObject.countryCode) ? settingsObject.countryCode : '';
    aliShipFrom.latitude = '';
    aliShipFrom.longitude = '';
    return aliShipFrom;
}

/**
 * This utility is for fetching BevAlc Attributes for header level
 * @param {Object} bevAlcTransactionAttributes contains all the BevAlc Attributes for header level required/optional for transaction
 */
 function getBevAlcTransactionAttributes() {
	var bevAlcTransactionAttributes = [

        // Required attributes for Bev Alc Transaction
        // {
		// 	"name":"AlcoholRouteType",
		// 	"value": ""
		// },

        // Required attributes for Returns
        // Uncomment only the section you want to populate
        // empty "value" will cause error

        // {
		// 	"name":"PurchaserDOB",
		// 	"value": ""
		// },
        // {
		// 	"name":"TrackingNumber",
		// 	"value": ""
		// },
        // {
		// 	"name":"IsDirectAlcoholImport",
		// 	"value": ""
		// },
        // {
		// 	"name":"PurchaserName",
		// 	"value": ""
		// },
        // {
		// 	"name":"ShipDate",
		// 	"value": ""
		// },
        // {
		// 	"name":"SalesLocation",
		// 	"value": ""
		// },
        // {
		// 	"name":"PurchaserStreetAddress",
		// 	"value": ""
		// },
        // {
		// 	"name":"PurchaserToCity",
		// 	"value": ""
		// },
        // {
		// 	"name":"PurchaserToState",
		// 	"value": ""
		// },
        // {
		// 	"name":"PurchaserToZip",
		// 	"value": ""
		// },
        // {
		// 	"name":"CarrierCode",
		// 	"value": ""
		// },
        // {
		// 	"name":"FullfillmentHouseCode",
		// 	"value": ""
		// },
        // {
		// 	"name":"Varietal",
		// 	"value": ""
		// }
    ];
	return bevAlcTransactionAttributes;
}

/**
 * Provides the bevalc parameters object for Transaction Lines containing attributes if it is a bev-alc related product.
 * Utilizes hooks to fetch configuration object
 * Hook "app.custom.bevAlc.fetchBevAlcConfiguration" can be used to override the default configuration JSON
 * @param {string} productId is Product Id
 * @returns {object} returns an object containing bev alc attributes
 */
 function getBevAlcAttributesForLines(productID) {
	var bevAlcAttributes;

    if(dw.system.HookMgr.hasHook( "app.custom.bevAlc.fetchBevAlcConfiguration")) {
        bevAlcAttributes = dw.system.HookMgr.callHook('app.custom.bevAlc.fetchBevAlcConfiguration', 'fetchBevAlcConfiguration', productID );
    }

	return bevAlcAttributes;
 }

module.exports = {
    getAllLineItems: getAllLineItems,
    verifyBevAlcEnabled: verifyBevAlcEnabled,
	getBevAlcTransactionAttributes: getBevAlcTransactionAttributes
}
