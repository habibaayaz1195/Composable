jQuery(document).ready(function ($) {
	main($);
	$('body').css('display', 'block');
});

var saveTransactionsToAvatax;

function main($) {

	var rows_selected = [];

	// Disable Reconcile Button if no applicable orders
	var amountOrTaxMismatch = $('td#amtortax-mismatch').text().replace(/\n/g,'');
	var missingInAvatax = $('td#av-mis').text().replace(/\n/g,'');

	if(( amountOrTaxMismatch == '' && missingInAvatax == '' ) || ( amountOrTaxMismatch == '0' && missingInAvatax == '0' )) {
		$('#submit-btn').attr('disabled','disabled');
	}

	// Initialize Datepicker
	$('#fromdate, #todate').datepicker();

	function updateDataTableSelectAllCtrl(table) {
		var $table = table.table().node();
		var $chkbox_all = $('tbody input[type="checkbox"]', $table);
		var $chkbox_checked = $('tbody input[type="checkbox"]:checked', $table);
		var chkbox_select_all = $('thead input[name="select_all"]', $table).get(0);

		// If none of the checkboxes are checked
		if ($chkbox_checked.length === 0) {
			chkbox_select_all.checked = false;
			if ('indeterminate' in chkbox_select_all) {
				chkbox_select_all.indeterminate = false;
			}

			// If all of the checkboxes are checked
		} else if ($chkbox_checked.length === $chkbox_all.length) {
			chkbox_select_all.checked = true;
			if ('indeterminate' in chkbox_select_all) {
				chkbox_select_all.indeterminate = false;
			}

			// If some of the checkboxes are checked
		} else {
			chkbox_select_all.checked = true;
			if ('indeterminate' in chkbox_select_all) {
				chkbox_select_all.indeterminate = true;
			}
		}
	}

	// Initialize datatable
	var table = $('#av-data-table').DataTable({
		columnDefs: [{
			'targets': 0,
			'searchable': false,
			'orderable': false,
			'width': '1%',
			'className': 'dt-body-center',
			'render': function (data, type, full, meta) {
				return '<input type="checkbox">';
			}
		}],
		order: [
			[1, 'asc']
		],
	});

	// Handle click on checkbox
	$('#av-data-table tbody').on('click', 'input[type="checkbox"]', function (e) {
		var $row = $(this).closest('tr');

		// Get row data
		var data = table.row($row).data();

		// Get row ID
		var rowId = data[0];

		// Determine whether row ID is in the list of selected row IDs 
		var index = $.inArray(rowId, rows_selected);

		// If checkbox is checked and row ID is not in list of selected row IDs
		if (this.checked && index === -1) {
			rows_selected.push(rowId);

			// Otherwise, if checkbox is not checked and row ID is in list of selected row IDs
		} else if (!this.checked && index !== -1) {
			rows_selected.splice(index, 1);
		}

		if (this.checked) {
			$row.addClass('selected');
		} else {
			$row.removeClass('selected');
		}

		// Update state of "Select all" control
		updateDataTableSelectAllCtrl(table);

		// Prevent click event from propagating to parent
		e.stopPropagation();
	});

	// Handle click on table cells with checkboxes
	$('#av-data-table').on('click', 'tbody td, thead th:first-child', function (e) {
		$(this).parent().find('input[type="checkbox"]').trigger('click');
	});

	// Handle click on "Select all" control
	$('thead input[name="select_all"]', table.table().container()).on('click', function (e) {
		if (this.checked) {
			$('#av-data-table tbody input[type="checkbox"]:not(:checked)').trigger('click');
		} else {
			$('#av-data-table tbody input[type="checkbox"]:checked').trigger('click');
		}

		// Prevent click event from propagating to parent
		e.stopPropagation();
	});

	// Handle table draw event
	table.on('draw', function () {
		// Update state of "Select all" control
		updateDataTableSelectAllCtrl(table);
	})

	$('div#main-pane').on('click', '.av-tooltip', function (e) {
		e.preventDefault();
		return;
	});

	$(document).on({
		ajaxStart: function () {
			if ($('div#main-pane').data('ajax') == true) {
				$('body').addClass("loading");
			}

		},
		ajaxStop: function () {
			if ($('div#main-pane').data('ajax') == true) {
				$('div#main-pane').data('ajax', false);
				if (saveTransactionsToAvatax != 'No') {
					$('#count-report').find('td#reconciled').text(reconciledCount + " out of " + noOfOrdersSelected + " selected");
				} else {
					$('#count-report').find('td#reconciled').html("<a id='recon-text' href='#'>" + reconciledCount + " out of " + noOfOrdersSelected + " selected" + "</a>");

					$('#recon-text').attr('title', "No transactions have been reconciled since the AvaTax setting 'Save transactions to AvaTax' is disabled.");
					$('#recon-text').tooltip({

						show: null,
						position: {
							my: "left top",
							at: "right bottom"
						},
						open: function (event, ui) {
							ui.tooltip.animate({
								top: ui.tooltip.position().top + 10
							}, "fast");
						}
					});

					$('#recon-text').on('click', function (e) {
						e.preventDefault();
					});
				}

			}

			$('body').removeClass("loading");
		}
	});

	// Search orders button
	$('div#main-pane').on('click', '#search-orders', function (e) {
		e.preventDefault();
		var url = $(this).closest('div#selection-criteria').data('submit-method').toString(),
			fromdate = $(this).closest('div#selection-criteria').find('input#fromdate').val(),
			todate = $(this).closest('div#selection-criteria').find('input#todate').val();



		if (fromdate == '' || todate == '') {
			$("#display-all-orders-dialog").dialog({
				resizable: false,
				height: "auto",
				width: 400,
				modal: true,
				buttons: {
					"Yes, please": function () {
						$(this).dialog("close");
						window.location.replace(url + "?fromdate=" + fromdate + "&todate=" + todate);
					},
					Cancel: function () {
						$(this).dialog("close");
					}
				}
			});
		} else {
			window.location.replace(url + "?fromdate=" + fromdate + "&todate=" + todate);
		}


	});


	var noOfOrdersSelected = 0,
		saveTransactionsToAvatax;

	// Submit action
	$('div#main-pane').on('click', '#submit-btn', function (e) {
		e.preventDefault();
		var $table = $('.orders-table');

		var siteInfoURL = $(this).data('siteinfo');

		var checked = $table.find('tr.selected');

		var ordersSelected = [];
		$.each(checked, function (index, value) {
			var orderno = $(value).data('orderno'),
				reconStatus = $(value).data('reconstatus');

			if (orderno != null && reconStatus != 'Missing In B2C') {
				ordersSelected.push(orderno);
			}

		});

		if (ordersSelected.length == 0) {
			$('#no-orders-selected-dialog').dialog({
				resizable: false,
				height: 155,
				width: 450
			});
		} else {

			$.ajax({
					type: 'get',
					url: siteInfoURL
				})
				.done(function (data) {

					var siteInfo = data.siteInfo;


					var avataxEnabled = siteInfo.avataxEnabled,
						commitTransactionsToAvatax = siteInfo.commitTransactionsToAvatax;

					saveTransactionsToAvatax = siteInfo.saveTransactionsToAvatax;


					if (avataxEnabled != 'Enabled' || saveTransactionsToAvatax != 'Yes') {
						window.location.href = window.location.href;
						return;
					} else {
						$("#reconcile-dialog-confirm").dialog({
							resizable: false,
							height: "auto",
							width: 400,
							modal: true,
							buttons: {
								"Yes, please": function () {
									noOfOrdersSelected = ordersSelected.length;
									$(this).dialog("close");
									reconcileAJAX($, ordersSelected);
									$('form[name="orders-form"]').addClass('loader');
								},
								Cancel: function () {
									$(this).dialog("close");
								}
							}
						});
					}

				});


		}

		return;
	});

	// Re Verify action
	$('div#main-pane').on('click', '#reverify-btn', function (e) {
		e.preventDefault();
		handleReverifyOrOverrideBtnClick($, false);
	});

	// Re Verify action
	$('div#main-pane').on('click', '#override-btn', function (e) {
		e.preventDefault();
		handleReverifyOrOverrideBtnClick($, true);
	});

	// Re Verify action
	$('div#main-pane').on('click', '#cancel-btn', function (e) {
		e.preventDefault();
		handleCancelBtnClick($);
	});
}

var reconciledCount = 0;

/**
 * This Method reconciles orders
 * Overrides the b2c tax values with service response
 * @param {Object} $ jQuery refernce
 * @param {Array} ordersSelected containing all the selected orders
 */
function reconcileAJAX($, ordersSelected) {

	var url = $('#submit-btn').data('method');

	$('div#main-pane').data('ajax', true);

	amountOrTaxMisMatchCount = 0;
	missingInAvaTaxCount = 0;
	missingInSFCCCount = 0;
	reconciledCount = 0;

	for (var i = 0; i < ordersSelected.length; i++) {
		// request to avalara
		$.ajax({
				type: 'POST',
				url: url,
				data: {
					orderno: ordersSelected[i]
				}

			})
			.done(function (data) {
				$("tr[data-orderno*='" + data.orderno + "']").find('td.td-reconcile-status').find('span').hide();
				var $statusText = $("tr[data-orderno*='" + data.orderno + "']").find('span#recon-status-text');
				var statusText = $("tr[data-orderno*='" + data.orderno + "']").find('span#recon-status-text').text();

				var $okimg = $("tr[data-orderno*='" + data.orderno + "']").find('td.td-reconcile-status').find('span#ok-img');

				if (!data.ERROR) {
					if (data.taxAmt) {
						$("tr[data-orderno*='" + data.orderno + "']").find('td.td-av-order-tax').css({
							"color": "Black",
							"font-weight": "bold"
						}).text("").text(data.taxAmt);
					}
					if (data.totalAmt) {
						$("tr[data-orderno*='" + data.orderno + "']").find('td.td-av-order-amount').css({
							"color": "Black",
							"font-weight": "bold"
						}).text("").text(data.totalAmt);
					}


					if (saveTransactionsToAvatax != 'No') {
						$statusText.text('Reconciled');
						$okimg.attr('title', "Document has been updated in AvaTax");
						$okimg.show();
						$statusText.show();
						reconciledCount++;

						$okimg.tooltip({
							show: null,
							position: {
								my: "left top",
								at: "left bottom"
							},
							open: function (event, ui) {
								ui.tooltip.animate({
									top: ui.tooltip.position().top + 10
								}, "fast");
							}
						});
					} else {
						$statusText.text(statusText).show();
					}

					// update count report table
					if (saveTransactionsToAvatax != 'No') {
						$('#count-report').find('td#reconciled').text(reconciledCount + " out of " + (ordersSelected.length) + " selected");
					} else {
						$('#count-report').find('td#reconciled').html("<a id='recon-text' href='#'>" + reconciledCount + " out of " + (ordersSelected.length) + " selected" + "</a>");

						$('#recon-text').attr('title', "No transactions have been reconciled since the AvaTax setting 'Save transactions to AvaTax' is disabled.");
						$('#recon-text').tooltip({

							show: null,
							position: {
								my: "left top",
								at: "right bottom"
							},
							open: function (event, ui) {
								ui.tooltip.animate({
									top: ui.tooltip.position().top + 10
								}, "fast");
							}
						});

						$('#recon-text').on('click', function (e) {
							e.preventDefault();
						});
					}


				} else if (data.ERROR) {

					if (data.fatalmsg && data.fatalmsg != '') {
						window.location.href = window.location.href;
						return;
					}

					var $errimg = $("tr[data-orderno*='" + data.orderno + "']").find('td.td-reconcile-status').find('span#err-img');

					$statusText.text('Error');
					$errimg.attr('title', data.msg);
					$errimg.show();
					$statusText.show();
					$errimg.tooltip({
						show: null,
						position: {
							my: "left top",
							at: "left bottom"
						},
						open: function (event, ui) {
							ui.tooltip.animate({
								top: ui.tooltip.position().top + 10
							}, "fast");
						}
					});
				}

				// update count report table
				if (saveTransactionsToAvatax != 'No') {
					$('#count-report').find('td#reconciled').text(reconciledCount + " out of " + (ordersSelected.length) + " selected");
				} else {
					$('#count-report').find('td#reconciled').html("<a id='recon-text' href='#'>" + reconciledCount + " out of " + (ordersSelected.length) + " selected" + "</a>");

					$('#recon-text').attr('title', "No transactions have been reconciled since the AvaTax setting 'Save transactions to AvaTax' is disabled.");
					$('#recon-text').tooltip({

						show: null,
						position: {
							my: "left top",
							at: "right bottom"
						},
						open: function (event, ui) {
							ui.tooltip.animate({
								top: ui.tooltip.position().top + 10
							}, "fast");
						}
					});

					$('#recon-text').on('click', function (e) {
						e.preventDefault();
					});
				}


				if (statusText == 'Amount Mismatch' || statusText == 'Tax Mismatch') {
					amountOrTaxMisMatchCount++;
				}
				if (statusText == 'Missing In AvaTax') {
					missingInAvaTaxCount++;
				}
				if (statusText == 'Missing In B2C') {
					missingInSFCCCount++;
				}
			});
	}
}

/**
 * Helper method to perform Reverify/ Override action
 * @param {Object} $ jQuery reference
 * @param {Array} ordersSelected containing all the selected orders
 * @param {Boolean} isOverride is a boolean determines if action is taken from an Override Button
 */
function reVerifyOrOverrideAJAX($, ordersSelected, isOverride) {
	var url = $('#reverify-btn').data('method');

	$('div#main-pane').data('ajax', true);

	var compliantCount = 0;

	for (var i = 0; i < ordersSelected.length; i++) {
		// request to avalara
		$.ajax({
				type: 'POST',
				url: url,
				data: {
					orderno: ordersSelected[i],
					isOverride: isOverride
				}
			})
			.done(function (data) {

				$("tr[data-orderno*='" + data.orderno + "']").find('td.td-verify-status').find('span').hide();

				var $statusText = $("tr[data-orderno*='" + data.orderno + "']").find('span#verify-status-text');

				if (!data.ERROR) {

					$statusText.text($('#reverify-btn').data('labelcomp'));
                    var $okimg = $("tr[data-orderno*='" + data.orderno + "']").find('td.td-verify-status').find('span#ok-img');
					$okimg.attr('title', "Document has been committed in AvaTax");
					$okimg.show();
					$statusText.show();
					compliantCount++;

					$okimg.tooltip({
						show: null,
						position: {
							my: "left top",
							at: "left bottom"
						},
						open: function (event, ui) {
							ui.tooltip.animate({
								top: ui.tooltip.position().top + 10
							}, "fast");
						}
					});

				} else {

					if (data.fatalmsg && data.fatalmsg != '') {
						window.location.href = window.location.href;
						return;
					}

					$statusText.text('Error');
                    var $errimg = $("tr[data-orderno*='" + data.orderno + "']").find('td.td-verify-status').find('span#err-img');
					$errimg.attr('title', data.msg);
					$errimg.show();
					$statusText.show();
					$errimg.tooltip({
						show: null,
						position: {
							my: "left top",
							at: "left bottom"
						},
						open: function (event, ui) {
							ui.tooltip.animate({
								top: ui.tooltip.position().top + 10
							}, "fast");
						}
					});
				}
			});
	}
}

/**
 * Helper method to perform Cancel action
 * @param {Object} $ jQuery reference
 * @param {Array} ordersSelected containing all the selected orders
 */
 function cancelAJAX($, ordersSelected, cancelledCompliantOrdersSelected) {
	var url = $('#cancel-btn').data('method');

	$('div#main-pane').data('ajax', true);

	var cancelledCount = 0;

	for (var i = 0; i < ordersSelected.length; i++) {
		// request to avalara
		$.ajax({
				type: 'POST',
				url: url,
				data: {
					orderno: ordersSelected[i],
					isCompliant: cancelledCompliantOrdersSelected.includes(ordersSelected[i])
				}
			})
			.done(function (data) {

				$("tr[data-orderno*='" + data.orderno + "']").find('td.td-verify-status').find('span').hide();

				var $statusText = $("tr[data-orderno*='" + data.orderno + "']").find('span#verify-status-text');

				if (!data.ERROR) {

					$statusText.text('Cancelled');
                    var $okimg = $("tr[data-orderno*='" + data.orderno + "']").find('td.td-verify-status').find('span#ok-img');
					$okimg.attr('title', "Document has been Voided in AvaTax");
					$okimg.show();
					$statusText.show();
					cancelledCount++;

					$okimg.tooltip({
						show: null,
						position: {
							my: "left top",
							at: "left bottom"
						},
						open: function (event, ui) {
							ui.tooltip.animate({
								top: ui.tooltip.position().top + 10
							}, "fast");
						}
					});

				} else {

					if (data.fatalmsg && data.fatalmsg != '') {
						window.location.href = window.location.href;
						return;
					}

					$statusText.text('Error');
                    var $errimg = $("tr[data-orderno*='" + data.orderno + "']").find('td.td-verify-status').find('span#err-img');
					$errimg.attr('title', data.msg);
					$errimg.show();
					$statusText.show();
					$errimg.tooltip({
						show: null,
						position: {
							my: "left top",
							at: "left bottom"
						},
						open: function (event, ui) {
							ui.tooltip.animate({
								top: ui.tooltip.position().top + 10
							}, "fast");
						}
					});
				}
			});
	}
}

/**
 * Helper method that identifies if the selected orders are applicable for current action
 * Checks if service is enabled
 * Calls another helper method to perform the Reverify/Override action
 * @param {Object} $ jQuery reference
 * @param {Boolean} isOverride is a boolean determines if action is taken from an Override Button
 */
 function handleReverifyOrOverrideBtnClick($, isOverride) {
	var $table = $('.orders-table');
	var siteInfoURL = $('#reverify-btn').data('siteinfo');
	var checked = $table.find('tr.selected');
	var confirmReconcile = false;
	var ordersSelected = [];

	$.each(checked, function (index, value) {
		var orderno = $(value).data('orderno'),
			reconStatus = $(value).data('reconstatus'),
			verificationStatus = $(value).data('verifystatus');

		if (orderno != null && verificationStatus === $('#reverify-btn').data('labelnoncomp') && reconStatus != 'Missing In B2C') {
			ordersSelected.push(orderno);

			if(reconStatus != '-') {
				confirmReconcile = true;
			}
		}

	});

	if (ordersSelected.length == 0) {
		$('#no-orders-verify-selected-dialog').dialog({
			resizable: false,
			height: 155,
			width: 450
		});
	} else {

		$.ajax({
				type: 'get',
				url: siteInfoURL
			})
			.done(function (data) {

				var siteInfo = data.siteInfo;
				var avataxEnabled = siteInfo.avataxEnabled;

				if (avataxEnabled != 'Enabled') {
					window.location.href = window.location.href;
					return;
				} else {
					var verifyDialogHTML = '<p>';
					if(confirmReconcile) {
						verifyDialogHTML += 'One or more orders selected has records which are not reconciled. ';
					}
					verifyDialogHTML += 'Upon successful verification and shipment registration, all transactions will be marked <i>Committed</i>. Do you want to proceed?</p>';

					$("#verify-dialog-confirm").html(verifyDialogHTML);

					$("#verify-dialog-confirm").dialog({
						resizable: false,
						height: "auto",
						width: 400,
						modal: true,
						buttons: {
							"Yes, please": function () {
								noOfOrdersSelected = ordersSelected.length;
								$(this).dialog("close");
								reVerifyOrOverrideAJAX($, ordersSelected, isOverride);
								$('form[name="orders-form"]').addClass('loader');
							},
							Cancel: function () {
								$(this).dialog("close");
							}
						}
					});
				}

			});
	}

	return;
}

/**
 * Helper method that identifies if the selected orders are applicable for cancel action
 * Checks if service is enabled
 * Calls another helper method to perform the Cancel action
 * @param {Object} $ jQuery reference
 */
function handleCancelBtnClick($) {
	var $table = $('.orders-table');
	var siteInfoURL = $('#cancel-btn').data('siteinfo');
	var checked = $table.find('tr.selected');
	var ordersSelected = [];
	var cancelledCompliantOrdersSelected = [];

	$.each(checked, function (index, value) {
		var orderno = $(value).data('orderno'),
			verificationStatus = $(value).data('verifystatus');

		if (orderno != null && (verificationStatus === $('#cancel-btn').data('labelnoncomp') || verificationStatus === $('#cancel-btn').data('labelcnclldcomp'))) {
			ordersSelected.push(orderno);

			(verificationStatus === $('#cancel-btn').data('labelcnclldcomp')) && cancelledCompliantOrdersSelected.push(orderno);
		}

	});

	if (ordersSelected.length == 0) {
		$('#no-orders-verify-selected-dialog').dialog({
			resizable: false,
			height: 155,
			width: 450
		});
	} else {

		$.ajax({
				type: 'get',
				url: siteInfoURL
			})
			.done(function (data) {

				var siteInfo = data.siteInfo;
				var avataxEnabled = siteInfo.avataxEnabled;

				if (avataxEnabled != 'Enabled') {
					window.location.href = window.location.href;
					return;
				} else {
					var verifyDialogHTML = '<p>Upon successful cancellation, all the Avalara transactions will be marked <i>Voided</i> and all the B2C transactions will be marked <i>Cancelled</i>. Do you want to proceed?</p>';

					$("#verify-dialog-confirm").html(verifyDialogHTML);

					$("#verify-dialog-confirm").dialog({
						resizable: false,
						height: "auto",
						width: 400,
						modal: true,
						buttons: {
							"Yes, please": function () {
								noOfOrdersSelected = ordersSelected.length;
								$(this).dialog("close");
								cancelAJAX($, ordersSelected, cancelledCompliantOrdersSelected);
								$('form[name="orders-form"]').addClass('loader');
							},
							Cancel: function () {
								$(this).dialog("close");
							}
						}
					});
				}

			});
	}

	return;
}