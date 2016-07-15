
//  ################################# UTILITIES ############################################
//
//  This file is used for general purpose functions associated with model dialogs.
//	It requires some associated HTML to be placed in the *.html files from which
//	the modal dialog will be used.
//
//	--Norm Jones
//
//  ########################################################################################

"use strict";

// Error message function using bootstrap
function error_message(errMessageText) {
    $('#GenericModal').on('show.bs.modal', function (event) {
    	$('#ModalTitle').text('Error Message');
        $('#ModalBody').text(errMessageText);
        $('#ModalFooter').hide();
    })
    $('#GenericModal').modal('show')
}

// Generic modal dialog using bootstrap
function modal_dialog(title, htmlBody, showFooter) {
    $('#GenericModal').on('show.bs.modal', function (event) {
        $('#ModalTitle').text(title);
        $('#ModalBody').html(htmlBody);   
        if (showFooter)
        	$('#ModalFooter').show();
        else
        	$('#ModalFooter').hide();
    })
    $('#GenericModal').modal('show')
}
