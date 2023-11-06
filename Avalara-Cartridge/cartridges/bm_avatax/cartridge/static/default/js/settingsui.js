jQuery(document).ready(function ($) {
    main($);
    $('body').css('display', 'block');
});

function main($) {

    $.LoadingOverlaySetup({
        background: "rgba(255, 255, 255, 0.8)",
        image: $('#main-pane').data('img'),
        minSize: 10,
        maxSize: 80,
        imageAnimation: ''
    });

    initEvents($);

    $('#tabs').tabs();

}




function initEvents($) {

    initTooltips($);

    

    $('#main-pane').on('click', '#submit-btn', function (e) {
        e.preventDefault();
        var $form = $('#settings-form');
        saveFormData($, $form);

    });



    $('#main-pane').on('click', '#reset-btn', function (e) {
        e.preventDefault();
        var $form = $('#settings-form');

        $('#dummy-div').html('<p><span class="ui-icon ui-icon-alert" style="float:left; margin:2px 7px 50px 0;"></span>All the settings will be reset to their default values.</p>');
        $('#dummy-div').dialog({
            title: 'Reset Confirmation',
            resizable: false,
            draggable: false,
            top: '0',
            height: 'auto',
            width: '290px',
            modal: true,
            buttons: {
                'Yes': function () {
                    $(this).dialog("close");
                    $('#dummy-div').dialog('destroy');
                    resetFormData($, $form);
                },
                'Cancel': function () {
                    $(this).dialog("close");
                    $('#dummy-div').dialog('destroy');
                }
            }
        });


    });

    $('#main-pane').on('click', '#test-con-btn', function (e) {
        e.preventDefault();
        $("body").LoadingOverlay("show");
        var url = $(this).data('url');

        var resolved = function (data) {
            
            $('#message').css('color', '#049504');
            $('#message').text(data.message);
            var services = data.services;
            var htmlContent = '';

            if (services.length > 0) {
                htmlContent += '<div style="border: 1px lightgray solid; padding: 10px;">' + data.message +", Subscribed AvaTax services:"+ '<ol>';

                for (var i = 0; i < services.length; i++) {
                    htmlContent += '<li>' + services[i] + '</li>';
                }

                htmlContent += '</ol></div>';
            } else {
                $('body').LoadingOverlay('hide');
                // Show error to the user
            }

            $('#dummy-div').html(htmlContent);

            $('#dummy-div').dialog({
                title: 'Test AvaTax Connection',
                resizable: false,
                draggable: false,
                top: '0',
                height: 290,
                width: 400,
                modal: true,
                buttons: {
                    Close: function () {
                        $(this).dialog('close');
                        $('#dummy-div').dialog('destroy');
                    }
                }
            });

            $('body').LoadingOverlay('hide');

        };

        var rejected = function (data) {
            $('#message').css('color', 'red');
            $('#message').text(data.message);

            $("body").LoadingOverlay("hide");
        };

        var promise = new Promise(function (resolve, reject) {
            $.ajax({
                method: 'GET',
                url: url
            }).done(function (result) {
                if (!result.success) {
                    rejected(result);
                } else {
                    resolved(result);
                }
            });
        });
        promise.then(resolved, rejected);

    });

    $('#void-order-no').on('keypress', function (e) {
        var keycode = (e.keyCode ? e.keyCode : e.which);
        if (keycode == '13') {
            $('#void-btn').trigger('click');
        }

    });

    $('#commit-order-no').on('keypress', function (e) {
        var keycode = (e.keyCode ? e.keyCode : e.which);
        if (keycode == '13') {
            $('#commit-btn').trigger('click');
        }

    });


    $('#validate-order-no').on('keypress', function (e) {
        var keycode = (e.keyCode ? e.keyCode : e.which);
        if (keycode == '13') {
            $('#validate-btn').trigger('click');
        }

    });

    $('#main-pane').on('click', '#void-btn', function (e) {
        e.preventDefault();

        var orderno = $(this).closest('tr').find('#void-order-no').val().trim();

        if (orderno.length <= 0) {
            $('#transaction-msg').css('color', 'red');
            $('#transaction-msg').text('Enter order number to void its transaction.');

            return;
        }
        voidTransaction($, $(this), orderno);
    });


    $('#main-pane').on('click', '#commit-btn', function (e) {
        e.preventDefault();

        var orderno = $(this).closest('tr').find('#commit-order-no').val().trim();


        if (orderno.length <= 0) {
            $('#transaction-msg').css('color', 'red');
            $('#transaction-msg').text('Enter order number to commit its transaction.');

            return;
        }
        commitTransaction($, $(this), orderno);
    });

    $('#main-pane').on('click', '#validate-btn', function (e) {
        e.preventDefault();

        var orderno = $(this).closest('tr').find('#validate-order-no').val().trim();

        if (orderno.length <= 0) {
            $('#transaction-msg').css('color', 'red');
            $('#transaction-msg').text('Enter order number to validate its address.');

            return;
        }
        validateAddress($, $(this), orderno);
    });


    $('#main-pane').on('change', '#select-use-custom-customercode', function (e) {
        e.preventDefault();

        if ($(this).val() == 'custom_attribute') {
            $(this).closest('div.td-container').find('input#custom-attr-ip-field').removeAttr('disabled');
            $(this).closest('div.td-container').find('input#custom-attr-ip-field').attr({
                "title": "Enter ID of the attribute under System Object 'Profile'. e.g. If the fax number is expected to be used as customer identifier, use 'fax'. If it's a custom attribute, prepend 'custom.' to it. e.g. custom.fax"
            });
        } else {
            $(this).closest('div.td-container').find('input#custom-attr-ip-field').attr('disabled', 'disabled');
            $(this).closest('div.td-container').find('input#custom-attr-ip-field').removeAttr('title');
        }

    });


    $('#main-pane').on('click', '#validate-address-btn', function (e) {
        e.preventDefault();
        $('#msg').text('');

        var $validateAddressBtn = $('#validate-address-btn');

        var addressFormValues = {};
        var url = $(this).data('url');

        var $settingsForm = $('#settings-form');

        var line1 = $settingsForm.find('#address-line1').val() || '';
        var line2 = $settingsForm.find('#address-line2').val() || '';
        var line3 = $settingsForm.find('#address-line3').val() || '';
        var city = $settingsForm.find('#address-city').val() || '';
        var state = $settingsForm.find('#address-state').val() || '';
        var zipCode = $settingsForm.find('#address-zipcode').val() || '';
        var countryCode = $settingsForm.find('#input-countrycode').val() || 'USA';
        var locationCode = $('#address-location-code').val();


        if($('#select-addressvalidation').val().toString().trim() == 'false'){
            $validateAddressBtn.notify('Address Validation is disabled.', 'error');
            return;
        }

        if (countryCode.toString().toLowerCase() != 'us' && countryCode.toString().toLowerCase() != 'usa' &&countryCode.toString().toLowerCase() != 'canada') {
            $validateAddressBtn.notify('Non-usa/canada --> ' + countryCode);
        }

        if (line1 == '' || zipCode == '') {
            if ($('#address-location-code').val().toString().trim() == '') {
                $validateAddressBtn.notify('Line 1 and Zip/Postal Code are required for address validation.', 'error');
                return;
            }

            
            $validateAddressBtn.notify('Address fields are optional if Location Code is provided.', 'info');

            return;
        }

        addressFormValues = {
            line1: line1,
            line2: line2,
            line3: line3,
            city: city,
            state: state,
            zipCode: zipCode,
            countryCode: countryCode
        };

        // AJAX request
        
        $('body').LoadingOverlay('show');

        var resolved = function (data) {
            $('#dummy-div').html(
                
                '<p style="font-size: 1.5rem;" align="center">Validated Address</p>' +
                    '<table style = "border-collapse: collapse; width: 100%;" > ' +
                    '<tr>' +
                    '<td style="border: 1px solid #dddddd; text-align: left; padding: 8px;">' +
                    'Address Line 1' +
                    '</td>' +
                    '<td style="border: 1px solid #dddddd; text-align: left; padding: 8px;">' +
                    data.validateAddress.line1 +
                    '</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td style="border: 1px solid #dddddd; text-align: left; padding: 8px;">' +
                    'Address Line 2' +
                    '</td>' +
                    '<td style="border: 1px solid #dddddd; text-align: left; padding: 8px;">' +
                    data.validateAddress.line2 +
                    '</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td style="border: 1px solid #dddddd; text-align: left; padding: 8px;">' +
                    'Address Line 3' +
                    '</td>' +
                    '<td style="border: 1px solid #dddddd; text-align: left; padding: 8px;">' +
                    data.validateAddress.line3 +
                    '</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td style="border: 1px solid #dddddd; text-align: left; padding: 8px;">' +
                    'City' +
                    '</td>' +
                    '<td style="border: 1px solid #dddddd; text-align: left; padding: 8px;">' +
                    data.validateAddress.city +
                    '</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td style="border: 1px solid #dddddd; text-align: left; padding: 8px;">' +
                    'State' +
                    '</td>' +
                    '<td style="border: 1px solid #dddddd; text-align: left; padding: 8px;">' +
                    data.validateAddress.region +
                    '</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td style="border: 1px solid #dddddd; text-align: left; padding: 8px;">' +
                    'ZIP/Postal Code' +
                    '</td>' +
                    '<td style="border: 1px solid #dddddd; text-align: left; padding: 8px;">' +
                    data.validateAddress.postalCode +
                    '</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td style="border: 1px solid #dddddd; text-align: left; padding: 8px;">' +
                    'Country' +
                    '</td>' +
                    '<td style="border: 1px solid #dddddd; text-align: left; padding: 8px;">' +
                    data.validateAddress.country +
                    '</td>' +
                    '</tr>' +
                    '</table>' +
                    '<br>' +
                    '<p align="center" style="font-size: 1.2rem;">(Click <b>Use Validated Address</b> to replace the entered address with the validated address.)</p>'
            );
                
            $('#dummy-div').dialog({
                title: 'Address Validation',
                resizable: false,
                draggable: false,
                top: '0',
                height: 'auto',
                width: '550px',
                modal: true,
                buttons: {
                    'Use Validated Address': function () {
                        $('#address-line1').val(data.validateAddress.line1);
                        $('#address-line2').val(data.validateAddress.line2);
                        $('#address-line3').val(data.validateAddress.line3);
                        $('#address-city').val(data.validateAddress.city);
                        $('#address-state').val(data.validateAddress.region);
                        $('#address-zipcode').val(data.validateAddress.postalCode);
                        $('#input-countrycode').val(data.validateAddress.country);

                        $validateAddressBtn.notify('Address updated successfully.', 'success');

                        $(this).dialog('close');
                        $('#dummy-div').dialog('destroy');
                    },
                    Cancel: function () {
                        $(this).dialog('close');
                        $('#dummy-div').dialog('destroy');
                    }
                }
            });
            $('body').LoadingOverlay('hide');
        };

        var rejected = function (data) {
            if (!data.success && !!data.message) {
                $('#msg').text('');
                $('#msg').removeAttr('title');
                $('#msg').css('color', 'red');
                // $('#msg').text(data.message);

                $validateAddressBtn.notify(data.message || 'Problem validating address.', 'error');
            }

            $('body').LoadingOverlay('hide');
        };

        var promise = new Promise(function (resolve, reject) {
            $.ajax({
                method: 'POST',
                url: url,
                data: addressFormValues
            }).done(function (result) {
                if (!result.success) {
                    rejected(result);
                } else {
                    resolved(result);
                }
            });
        });
        promise.then(resolved, rejected);
    });
     
}

function initTooltips($) {
    $('#main-pane').tooltip();
}



function saveFormData($, $form) {

    $("body").LoadingOverlay("show");

    var url = $form.data('url'),
        formData = {};
    var taxCalculation = $('#select-taxcalculation').val();
    var addressValidation = $('#select-addressvalidation').val();
    var taxationpolicy = $('#select-taxationpolicy').val();
    var saveTransactions = $('#select-savetransactions').val();
    var commitTransactions = $('#select-committransactions').val();
    var companyCode = $('#company-code').val();

    var useCustomCustomerCode = $('#select-use-custom-customercode').val();
    var customCustomerAttribute = useCustomCustomerCode != 'custom_attribute' ? '' : $('#custom-attr-ip-field').val(); // empty if useCustomCustomerCode is not eq to 'custom_attribute'

    var defaultShippingMethodTaxCode = $('#defult-shipping-tax-code').val();

    // Address
    var locationCode = $('#address-location-code').val();
    var line1 = $('#address-line1').val();
    var line2 = $('#address-line2').val();
    var line3 = $('#address-line3').val();
    var city = $('#address-city').val();
    var state = $('#address-state').val();
    var zipcode = $('#address-zipcode').val();
    var countryCode = $('#input-countrycode').val();

    formData = {
        "taxCalculation": taxCalculation,
        "addressValidation": addressValidation,
        "taxationpolicy": taxationpolicy,
        "saveTransactions": saveTransactions,
        "commitTransactions": commitTransactions,
        "companyCode": companyCode,
        "useCustomCustomerCode": useCustomCustomerCode,
        "customCustomerAttribute": customCustomerAttribute,
        "defaultShippingMethodTaxCode": defaultShippingMethodTaxCode,

        "locationCode": locationCode,
        "line1": line1,
        "line2": line2,
        "line3": line3,
        "city": city,
        "state": state,
        "zipCode": zipcode,
        "countryCode": countryCode
    };

    var resolved = function (data) {
        $('#msg').text('');
        $('#msg').removeAttr('title');
        $('#msg').css('color', '#049504');
        $('#msg').text('Settings saved successfully.');


        setTimeout(function () {
            $('#msg').text('');
        }, 5000);

        $("body").LoadingOverlay("hide");
    };


    var rejected = function (data) {
        $('#msg').text('');
        $('#msg').removeAttr('title');
        $('#msg').css('color', 'red');
        $('#msg').text('There was a problem saving the settings.');
        $('#msg').attr('title', 'Please check the logs. If the problem persists, please contact Avalara support. (Error details - ' + data.message + ')');

        $("body").LoadingOverlay("hide");
    };

    var promise = new Promise(function (resolve, reject) {
        $.ajax({
                type: 'POST',
                url: url,
                data: formData

            })
            .done(function (data) {
                if (data.success) {
                    resolve(data);
                } else {
                    reject(data);
                }
            });
    });

    promise.then(resolved, rejected);



}


function resetFormData($, $form) {

    $("body").LoadingOverlay("show");

    $('#select-taxcalculation').val('true');
    $('#select-addressvalidation').val('false');
    $('#select-savetransactions').val('true');
    $('#select-committransactions').val('false');
    $('#company-code').val('default');

    $('#select-use-custom-customercode').val('customer_number');
    $('#custom-attr-ip-field').val(''); // empty if useCustomCustomerCode is not eq to 'custom_attribute'

    $('#defult-shipping-tax-code').val('FR');

    // Address
    $('#address-location-code').val('');
    $('#address-line1').val('');
    $('#address-line2').val('');
    $('#address-line3').val('');
    $('#address-city').val('');
    $('#address-state').val('');
    $('#address-zipcode').val('');
    $('#input-countrycode').val('US');


    $("body").LoadingOverlay("hide");
}



function voidTransaction($, $button, orderno) {
    $("body").LoadingOverlay("show");

    var url = $button.data('url');

    $('#response-json').text('');

    var resolved = function (data) {
        $('#transaction-msg').css('color', '#666');
        $('#transaction-msg').text('Void transaction: ' + data.message);

        $('#response-json').text(JSON.stringify(data.svcResponse));



        $("body").LoadingOverlay("hide");
    };

    var rejected = function (data) {
        $('#transaction-msg').css('color', 'red');
        $('#transaction-msg').text('Void transaction: ' + data.message);

        $('#response-json').text(data.message);

        $("body").LoadingOverlay("hide");
    };

    var promise = new Promise(function (resolve, reject) {
        $.ajax({
            method: 'POST',
            data: {
                orderno: orderno
            },
            url: url
        }).done(function (result) {
            if (!result.success) {
                rejected(result);
            } else {
                resolved(result);
            }
        });
    });
    promise.then(resolved, rejected);
}


function commitTransaction($, $button, orderno) {
    $("body").LoadingOverlay("show");
    $('#response-json').text('');

    var url = $button.data('url');

    var resolved = function (data) {
        $('#transaction-msg').css('color', '#666');
        $('#transaction-msg').text('Commit transaction: ' + data.message);

        $('#response-json').text(JSON.stringify(data.svcResponse));

        $("body").LoadingOverlay("hide");
    };

    var rejected = function (data) {
        $('#transaction-msg').css('color', 'red');
        $('#transaction-msg').text('Commit transaction: ' + data.message);

        $('#response-json').text(JSON.stringify(data.message));

        $("body").LoadingOverlay("hide");
    };

    var promise = new Promise(function (resolve, reject) {
        $.ajax({
            method: 'POST',
            data: {
                orderno: orderno
            },
            url: url
        }).done(function (result) {
            if (!result.success) {
                rejected(result);
            } else {
                resolved(result);
            }
        });
    });
    promise.then(resolved, rejected);
}



function validateAddress($, $button, orderno) {
    $("body").LoadingOverlay("show");
    $('#response-json').text('');

    var url = $button.data('url');

    var resolved = function (data) {
        $('#transaction-msg').css('color', '#666');
        $('#transaction-msg').text('Address validation: ' + data.message);

        $('#response-json').text(JSON.stringify(data.svcResponse));



        $("body").LoadingOverlay("hide");
    };

    var rejected = function (data) {
        $('#transaction-msg').css('color', 'red');
        $('#transaction-msg').text('Address validation: ' + data.message);

        $('#response-json').text(data.message);

        $("body").LoadingOverlay("hide");
    };

    var promise = new Promise(function (resolve, reject) {
        $.ajax({
            method: 'POST',
            data: {
                orderno: orderno
            },
            url: url
        }).done(function (result) {
            if (!result.success) {
                rejected(result);
            } else {
                resolved(result);
            }
        });
    });
    promise.then(resolved, rejected);
}