$(document).ready(function () {
    "use strict";
    
	var pgurl = window.location.pathname;
	var filename = pgurl.substring(pgurl.lastIndexOf('/')+1);
	$(".ad-menu ul li a").each(function(){
		var href = $(this).attr("href");
		if(href == filename ){
			$(this).addClass('s-act');
            $(this).parent().parent().parent().siblings("a").addClass('mact');
		}
	});

    $('.ad-menu ul li a.mact').siblings().slideDown();
    $('.ad-menu ul li a').on('click', function () {
        if($(this).hasClass("mact")){
            $(".ad-menu ul li div").slideUp();
            $('.ad-menu ul li a').removeClass('mact');
        }
        else{
            $(".ad-menu ul li div").slideUp();
            $('.ad-menu ul li a').removeClass('mact');
            $(this).addClass('mact');
            $(this).siblings().slideDown();
        }
    });
    $('.mopen').on('click', function () {
        $(this).fadeOut();
        $('.mclose').fadeIn();
        $('.ad-menu-lhs').addClass('mshow');
        $('.ad-dash').addClass('leftpadd');
    });
    $('.mclose').on('click', function () {
        $(this).fadeOut();
        $('.mopen').fadeIn();
        $('.ad-menu-lhs').removeClass('mshow');
        $('.ad-dash').removeClass('leftpadd');
    });
    //CREATE DUPLICATE LISTING
    $('.cre-dup-btn').on('click', function () {
        $('.cre-dup-form').slideDown();
    });
    //SERVICES LIST ADD - APPEND
    $(".lis-ser-add-btn").click(function () {
        $(".add-list-ser ul li:last-child").after('<li><div class="row"> <div class="col-md-6"> <div class="form-group"> <label>Service name 1:</label> <input type="text" name="service_id[]" class="form-control" placeholder="Ex: Plumbile"> </div> </div> <div class="col-md-6"> <div class="form-group"> <label>Choose profile image</label> <input type="file" name="service_image[]" class="form-control"> </div> </div> </div></li>');
    });
    //SERVICES OFFER LIST REMOVE - APPEND
    $(".lis-ser-rem-btn").click(function () {
        $(".add-list-ser ul li:last-child").remove();
    });
    //SPECIAL OFFER LIST ADD - APPEND
    $(".lis-add-off").click(function () {
        $(".add-list-off ul li:last-child").after('<li><div class="row"> <div class="col-md-6"> <div class="form-group"> <input type="text" name="service_1_name[]" class="form-control" placeholder="Offer name *"> </div> </div> <div class="col-md-6"> <div class="form-group"> <input type="text" name="service_1_price[]" class="form-control" onkeypress="return isNumber(event)" placeholder="Price"> </div> </div> </div><div class="row"> <div class="col-md-12"> <div class="form-group"> <textarea class="form-control" name="service_1_detail[]" placeholder="Details about this offer"></textarea> </div> </div> </div><div class="row"> <div class="col-md-12"> <div class="form-group"> <label>Choose offer image</label> <input type="file" name="service_1_image[]" class="form-control"> </div> </div> </div><div class="row"> <div class="col-md-12"> <div class="form-group"> <input type="text" name="service_1_view_more[]" class="form-control"  placeholder="View More Link"></div></div></div></li>');
    });
    //SPECIAL OFFER LIST ADD - APPEND
    // $(".lis-add-off").click(function(){
    //     $(".add-list-off ul li:last-child").after('<li><div class="row"> <div class="col-md-6"> <div class="form-group"> <input type="text" class="form-control" placeholder="Offer name *"> </div> </div> <div class="col-md-6"> <div class="form-group"> <input type="text" class="form-control" placeholder="Price"> </div> </div> </div><div class="row"> <div class="col-md-12"> <div class="form-group"> <textarea class="form-control" placeholder="Details about this offer"></textarea> </div> </div> </div><div class="row"> <div class="col-md-12"> <div class="form-group"> <label>Choose offer image</label> <input type="file" class="form-control"> </div> </div> </div></li>');
    // });
    //SPECIAL OFFER LIST REMOVE - APPEND
    $(".lis-add-rem").click(function () {
        $(".add-list-off ul li:last-child").remove();
    });
    //SPECIAL OFFER LIST ADD - APPEND
    $(".lis-add-oad").click(function () {
        $(".add-lis-oth ul li:last-child").after('<li> <div class="row"> <div class="col-md-5"> <div class="form-group"> <input type="text" name="listing_info_question[]" class="form-control" placeholder="Type your information"> </div> </div><div class="col-md-2"> <div class="form-group"> <i class="material-icons">arrow_forward</i> </div> </div> <div class="col-md-5"> <div class="form-group"> <input type="text" name="listing_info_answer[]" class="form-control" placeholder="yes"> </div> </div> </div> </li>');
    });
    //SPECIAL OFFER LIST REMOVE - APPEND
    $(".lis-add-ore").click(function () {
        $(".add-lis-oth ul li:last-child").remove();
    });
    //LISTING CATEGORY ADD - APPEND
    $(".cate-add-btn").click(function () {
        $(".add-ncate ul li:last-child").after('<li> <div class="row"> <div class="col-md-12"> <div class="form-group"> <input type="text" id="category_name" name="category_name[]" class="form-control" placeholder="Category name *" required> </div> </div><div class="col-md-12"><div class="form-group"><label>Choose category image</label><input type="file" name="category_image[]" id="category_image" class="form-control" required></div></div></div></li>');
    });
    //Job CATEGORY ADD - APPEND
    $(".job-cate-add-btn").click(function () {
        $(".add-ncate ul li:last-child").after('<li> <div class="row"> <div class="col-md-12"> <div class="form-group"> <input type="text" id="category_name" name="category_name[]" class="form-control" placeholder="Category name *" required> </div> </div></div></li>');
    });
    //Expert Paymemt ADD - APPEND
    $(".expert-paymente-add-btn").click(function () {
        $(".add-ncate ul li:last-child").after('<li> <div class="row"> <div class="col-md-12"> <div class="form-group"> <input type="text" id="payment_name" name="payment_name[]" class="form-control" placeholder="Payment name *" required> </div> </div></div></li>');
    });
    //LISTING CATEGORY REMOVE - APPEND
    $(".cate-rem-btn").click(function () {
        $(".add-ncate ul li:last-child").remove();
    });
    //Job CATEGORY REMOVE - APPEND
    $(".job-cate-rem-btn").click(function () {
        $(".add-ncate ul li:last-child").remove();
    });
    //Job CATEGORY REMOVE - APPEND
    $(".expert-paymente-rem-btn").click(function () {
        $(".add-ncate ul li:last-child").remove();
    });
    //COUNTRY ADD - APPEND
    $(".count-add-btn").click(function () {
        $(".add-ncate ul li:last-child").after('<li> <div class="row"> <div class="col-md-12"> <div class="form-group"> <input type="text" class="form-control" name="country_name[]" placeholder="Country name *" required> </div> </div> </div> </li>');
    });
    //COUNTRY REMOVE - APPEND
    $(".count-rem-btn").click(function () {
        $(".add-ncate ul li:last-child").remove();
    });
    //CITY ADD - APPEND
    $(".city-add-btn").click(function () {
        $(".add-ncate ul li:last-child").after('<li> <div class="row"> <div class="col-md-12"> <div class="form-group"> <input type="text" class="form-control" name="city_name[]" placeholder="City name *"> </div> </div> </div> </li>');
    });
    //CITY REMOVE - APPEND
    $(".city-rem-btn").click(function () {
        $(".add-ncate ul li:last-child").remove();
    });
    //Expert City ADD - APPEND
    $(".expert-city-add-btn").click(function () {
        $(".add-ncate ul li:last-child").after('<li> <div class="row"> <div class="col-md-12"> <div class="form-group"> <input type="text" class="form-control" name="country_name[]" placeholder="City name *" required> </div> </div> </div> </li>');
    });
    //Expert City REMOVE - APPEND
    $(".expert-city-rem-btn").click(function () {
        $(".add-ncate ul li:last-child").remove();
    });
    //Expert Area ADD - APPEND
    $(".expert-area-add-btn").click(function () {
        $(".add-ncate ul li:last-child").after('<li> <div class="row"> <div class="col-md-12"> <div class="form-group"> <input type="text" class="form-control" name="city_name[]" placeholder="Area name *" required> </div> </div> </div> </li>');
    });
    //Expert Area REMOVE - APPEND
    $(".expert-area-rem-btn").click(function () {
        $(".add-ncate ul li:last-child").remove();
    });
    //SUB CATEGORY ADD - APPEND
    $(".scat-add-btn").click(function () {
        $(".add-ncate ul li:last-child").after('<li> <div class="row"> <div class="col-md-12"> <div class="form-group"> <input type="text" class="form-control" placeholder="Sub category name *" name="sub_category_name[]" required> </div> </div> </div> </li>');
    });
    //SUB CATEGORY REMOVE - APPEND
    $(".scat-rem-btn").click(function () {
        var _listsubcate = $(".add-ncate ul li").length;
        if(_listsubcate >= 2){
            $(".add-ncate ul li:last-child").remove();
        }
        else{
            alert("Sorry! you are not allowed to remove the last one.");
        }
    });

    //AD HIGLIGHTS - APPEND
    $(".adhig-add-btn").click(function () {
        $(".ads-form-hig ul li:last-child").after('<li> <div class="row"> <div class="col-md-12"> <div class="form-group"> <input type="text" class="form-control" placeholder="Higlights *" name="sub_category_name[]" required> </div> </div> </div> </li>');
    });

    //VIDEO LIST ADD - APPEND
    $(".lis-add-oadvideo").on('click', function() {
        $(".add-list-map ul li:last-child").after('<li> <div class="row"> <div class="col-md-12"> <div class="form-group"> <textarea id="listing_video" name="listing_video[]" class="form-control" placeholder="Paste Your Youtube Url here"></textarea> </div> </div> </div> </li>');
    });
    //VIDEO LIST REMOVE - APPEND
    $(".lis-add-orevideo").on('click', function() {
        var _listvido = $(".add-list-map ul li").length;
        if(_listvido >= 2){
            $(".add-list-map ul li:last-child").remove();
        }
        else{
            alert("Sorry! you are not allowed to remove the last one.");
        }
    });

    //BOOTSTRAP TOOL TIP
    $('[data-bs-toggle="tooltip"]').tooltip();

    //PRODUCT SPECIFICATION LIST ADD - APPEND
    $(".prod-add-oad").on('click', function() {
        $(".add-prod-oth ul li:last-child").after('<li> <div class="row"> <div class="col-md-5"> <div class="form-group"> <input type="text" name="product_info_question[]" class="form-control" placeholder="Type your information"> </div> </div><div class="col-md-2"> <div class="form-group"> <i class="material-icons">arrow_forward</i> </div> </div> <div class="col-md-5"> <div class="form-group"> <input type="text" name="product_info_answer[]" class="form-control" placeholder="yes"> </div> </div> </div> </li>');
    });
    //PRODUCT SPECIFICATION LIST REMOVE - APPEND
    $(".prod-add-ore").on('click', function() {
        var _prodspec = $(".add-prod-oth ul li").length;
        if(_prodspec >= 2){
            $(".add-prod-oth ul li:last-child").remove();
        }
        else{
            alert("Sorry! you are not allowed to remove the last one.");
        }
    });

    //PRODUCT HIGHLIGHTS LIST ADD - APPEND
    $(".prod-add-high-oad").on('click', function() {
        $(".add-prod-high-oth ul li:last-child").after('<li> <div class="row"> <div class="col-md-12"> <div class="form-group"> <input type="text" name="product_highlights[]" class="form-control" placeholder="Type your highlights"> </div> </div> </div> </li>');
    });
    //PRODUCT HIGHLIGHTS LIST REMOVE - APPEND
    $(".prod-add-high-ore").on('click', function() {
        var _prohig = $(".add-prod-high-oth ul li").length;
        if(_prohig >= 2){
            $(".add-prod-high-oth ul li:last-child").remove();
        }
        else{
            alert("Sorry! you are not allowed to remove the last one.");
        }
    });

    //ENQUIRY AND REVIEW LIKE
    $(".enq-sav i").click(function () {
        $(this).toggleClass('sav-act');
    });

    //INTERNAL PAGE SEARCH
    $("#pg-sear").on("keyup", function () {
        var value = $(this).val().toLowerCase();
        $("#pg-resu tr").filter(function () {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
        });
    });
    
    //IMAGE FILE UPLOAD GET FILE NAME
    $(".fil-img-uplo input").on("change", function(){
        var _upldfname = $(this).val().replace(/C:\\fakepath\\/i, '');
        $(this).siblings(".dumfil").html(_upldfname);
    });
    //PLACE - WHAT PEOPLE ASK - APPEND
    $(".plac-ask-add").on('click', function() {
        $(".plac-ask-que li:last-child").after('<li> <div class="col-md-4"> <div class="form-group"> <label>Question:</label> <input type="text" name="place_info_question[]" required="required" class="form-control"> </div></div><div class="col-md-8"> <div class="form-group"> <label>Answer:</label> <input type="text" name="place_info_answer[]" required="required" class="form-control"> </div></div></li>');
    });
    //PLACE - WHAT PEOPLE ASK REMOVE - APPEND
    $(".plac-ask-remov").on('click', function() {
        var _placque = $(".plac-ask-que li").length;
        if(_placque >= 2){
            $(".plac-ask-que li:last-child").remove();
        }
        else{
            alert("Sorry! you are not allowed to remove the last one.");
        }
    });
    
    //ADS TOTAL DAYS CALCULATION
    $("#stdate, #endate, #adposi").change(function () {
        var firstDate = $("#stdate").val();
        var secondDate = $("#endate").val();
        var millisecondsPerDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
        var startDay = new Date(firstDate);
        var endDay = new Date(secondDate);
        var diffDays = Math.abs((startDay.getTime() - endDay.getTime()) / (millisecondsPerDay));
        $(".ad-tdays").text(diffDays);
        $("#ad_total_days").val(diffDays);
        var adpocost = $('#adposi').find('option:selected', this).attr('mytag');
        $(".ad-pocost").text(adpocost);
        $("#ad_cost_per_day").val(adpocost);
        var totcost = diffDays * adpocost;
        $(".ad-tcost").text(totcost);
        $("#ad_total_cost").val(totcost);
    });
});

//GET URL SOURCE
function urlParam(name) {
    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (results == null) {
        return null;
    } else {
        return results[1] || 0;
    }
}
//URL PAREM VALUE
//$("#source").val(urlParam("source"));
if (urlParam("login") == "register") {
    $('.log-1, .log-3').slideUp();
    $('.log-2').slideDown();
}

$(function () {
    $("#event_start_date").datepicker({
        changeMonth: true,
        changeYear: true,
        minDate: 0
    });
    $("#stdate").datepicker({
        changeMonth: true,
        changeYear: true,
        minDate: 0
    });
    $("#endate").datepicker({
        changeMonth: true,
        changeYear: true,
        minDate: 0
    });
});

//DOWNLOAD INVOICE
$('#downloadPDF').click(function () {
    domtoimage.toPng(document.getElementById('content2'))
        .then(function (blob) {
            var pdf = new jsPDF('l', 'pt', [$('#content2').width(), $('#content2').height()]);

            pdf.addImage(blob, 'PNG', 0, 0, $('#content2').width(), $('#content2').height());
            pdf.save("invoice.pdf");

            that.options.api.optionsChanged();
        });
});

//Number Only Input box

function isNumber(evt) {
    evt = (evt) ? evt : window.event;
    var charCode = (evt.which) ? evt.which : evt.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
        return false;
    }
    return true;
}


//Auto complete For City List Starts

jQuery(document).ready(function ($) {

    $(function () {
        $.ajax({
            url: '../city_search.html',
            success: function (response) {
                var cityArray = JSON.parse(response);

                // var dataCountry = {};
                // for (var i = 0; i < cityArray.length; i++) {
                //     dataCountry[cityArray[i]] = undefined; //cityArray[i].flag or null
                // }

                $('#select-city.autocomplete').autocomplete({  //Home Page City Search Box
                    source: cityArray,
                    minLength: 3, // The minimum number of characters to be entered
                    limit: 5 // The max amount of results that can be shown at once. Default: Infinity.
                });
            }
        });
    });
});

$(function() {
    $('.chosen-select').chosen();
});

var url = window.location.pathname;
var nav_nave = url.substring(url.lastIndexOf('/')+1);
$(".ad-menu ul li a").each(function(){
    if($(this).attr("href") == nav_nave){
        $(this).addClass('s-act');
    }
})

//SEARCH TERMS

var htmlElement = document.getElementById("res");
// $('.lhs ul li a').each(function(){
// 	if($(this).attr('href') != ""){
// 		var listElement = document.createElement("li");
// 		var aElement = document.createElement("a");
// 		aElement.innerHTML = $(this).text();
// 		aElement.setAttribute("href",$(this).attr('href'));
// 		listElement.appendChild(aElement);	
// 		htmlElement.appendChild(listElement);		
// 	}
// });




//SEARCH EVENTS
$(".search-field").focus(function(){
    $(".tser-res").addClass("act");
});
$(".search-field").click(function(){
    $(".tser-res").addClass("act");
});
$(".ad-dash").click(function(){
    $(".tser-res").removeClass("act");
});
$(".head-s2").mouseleave(function(){
    $(".tser-res").removeClass("act");
});

/* highlight matches text */
var highlight = function (string) {
    $("#tser-res li a.match").each(function () {
        var matchStart = $(this).text().toLowerCase().indexOf("" + string.toLowerCase() + "");
        var matchEnd = matchStart + string.length - 1;
        var beforeMatch = $(this).text().slice(0, matchStart);
        var matchText = $(this).text().slice(matchStart, matchEnd + 1);
        var afterMatch = $(this).text().slice(matchEnd + 1);
        $(this).html(beforeMatch + "<em>" + matchText + "</em>" + afterMatch);
    });
};


/* filter products */
$("#top_search").on("keyup click input", function () {
    if (this.value.length > 0) {
        $("#tser-res li a").removeClass("match").hide().filter(function () {
            return $(this).text().toLowerCase().indexOf($("#top_search").val().toLowerCase()) != -1;
        }).addClass("match").show();
        highlight(this.value);
        $("#tser-res").addClass("act");
    }
    else {
        //$("#tser-res, #tser-res li a").removeClass("match").hide();
    }
});

setTimeout(function () {
    $('.log-suc').fadeOut();
}, 4000);

// Mutliple delete related function starts

$(document).ready(function() {

    $('#checkall').change(function() {
        if(this.checked) {
            $('.delete_check').prop('checked', true);
            $('.multi-del-btn').css("display", "block");
            $('.multi-del-btn').removeAttr('disabled');
        }else{
            $('.delete_check').prop('checked', false);
            $('.multi-del-btn').css("display", "none");
        }
    });

});


function checkcheckbox(){
    // Total checkboxes
    var length = $('.delete_check').length;

    // Total checked checkboxes
    var totalchecked = 0;
    $('.delete_check').each(function(){
        if($(this).is(':checked')){
            totalchecked+=1;
        }
    });

    // Checked unchecked checkbox
    if(totalchecked == length){
        $("#checkall").prop('checked', true);
    }else{
        $('#checkall').prop('checked', false);
    }

    if(totalchecked == 0){
        $('.multi-del-btn').css("display", "none");
    }else{
        $('.multi-del-btn').css("display", "block");
        $('.multi-del-btn').removeAttr('disabled');
    }
}

// Mutliple delete related function ends

//MENU AUTO SCROLL
var container = $('.ad-menu-lhs'),
scrollTo = $('.mact');

container.animate({
    scrollTop: scrollTo.offset().top - container.offset().top + container.scrollTop() - 95
});

//PROFILE PAGE NUMBER COUNT
$('.count1').each(function () {
    $(this).prop('Counter', 0).animate({
        Counter: $(this).text()
    }, {
        duration: 5000,
        easing: 'swing',
        step: function (now) {
            $(this).text(Math.ceil(now));
        }
    });
});