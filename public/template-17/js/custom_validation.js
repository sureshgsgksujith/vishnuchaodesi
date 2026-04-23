// Register Form validation starts
$(document).ready(function () {
    $("#register_form").validate({
        onfocusout: function (element) {
            $(element).valid();
        },
        rules: {
            first_name: {required: true},
            user_type: {required: true},
            email_id: {required: true, email: true},
            mobile_number: {required: true},
            password: {required: true, minlength: 6, maxlength: 10},
            user_plan: {
                required: function () {
                    return $("#user_type").val() == "Service provider";
                }
            }
        },
        messages: {

            first_name: {required: "Name is Required"},
            user_type: {required: "User Type is Required"},
            email_id: {required: "Email ID is Required"},
            mobile_number: {required: "Phone Number is Required"},
            password: {required: "Password is Required"},
            user_plan: {required: "User Plan is Required"}
        },

        submitHandler: function (form) { // for demo
            form.submit();
        }
    });
});

// Register Form validation ends

// Login Form validation starts

$(document).ready(function () {
    $("#login_form").validate({
        onfocusout: function (element) {
            $(element).valid();
        },
        rules: {
            email_id: {required: true},
            password: {required: true}
        },
        messages: {
            email_id: {required: "Email ID is Required"},
            password: {required: "Password is Required"}
        },

        submitHandler: function (form) { // for demo
            form.submit();
        }
    });
});

// Login Form validation ends

// Forget Password Form validation starts

$(document).ready(function () {
    $("#forget_form").validate({
        onfocusout: function (element) {
            $(element).valid();
        },
        rules: {
            email_id: {required: true}
        },
        messages: {
            email_id: {required: "Email ID is Required"}
        },

        submitHandler: function (form) { // for demo
            form.submit();
        }
    });
});

// Forget Password Form validation ends

// Reset Password Form validation starts

$(document).ready(function () {
    $("#reset_password_form").validate({
        onfocusout: function (element) {
            $(element).valid();
        },
        rules: {
            password: {required: true},
            cnf_password: {required: true, equalTo: '[name="password"]'}
        },
        messages: {
            password: {required: "Password is Required"},
            cnf_password: {required: "Confirm Password is Required", equalTo: 'Password Does not Match!!'}
        },

        submitHandler: function (form) { // for demo
            form.submit();
        }
    });
});

// Reset Password Form validation ends

// Listing Form -1 validation starts
$(document).ready(function () {
    $("#listing_form_1").validate({
        onfocusout: function (element) {
            $(element).valid();
        },
        rules: {
            listing_name: {required: true},
            listing_address: {required: true},
            // listing_lat: {required: true},
            // listing_lng: {required: true},
            event_image: {required: true},
            event_address: {required: true},
            event_start_date: {required: true},
            event_time: {required: true},
            event_description: {required: true},
            event_email: {required: true, email: true},
            event_mobile: {required: true}
        },
        messages: {

            listing_name: {required: "Listing Name is Required"},
            event_contact_name: {required: "Contact Person Name is Required"},
            event_image: {required: "Event Image is Required"},
            listing_address: {required: "Listing Address is Required"},
            // listing_lat: {required: "Listing Latitude is Required"},
            // listing_lng: {required: "Listing Longitude is Required"},
            event_start_date: {required: "Event Date is Required"},
            event_time: {required: "Event Time is Required"},
            event_description: {required: "Event Description is Required"},
            event_email: {required: "Event Email ID is Required"},
            event_mobile: {required: "Phone Number is Required"}
        },

        submitHandler: function (form) { // for demo
            form.submit();
        }
    });
});

// Listing Form -1 validation ends

// Event Form validation starts
$(document).ready(function () {
    $("#event_form").validate({
        onfocusout: function (element) {
            $(element).valid();
        },
        rules: {
            event_name: {required: true},
            event_contact_name: {required: true},
            event_image: {required: true},
            event_address: {required: true},
            event_start_date: {required: true},
            event_time: {required: true},
            event_description: {required: true},
            event_email: {required: true, email: true},
            event_mobile: {required: true}
        },
        messages: {

            event_name: {required: "Event Name is Required"},
            event_contact_name: {required: "Contact Person Name is Required"},
            event_image: {required: "Event Image is Required"},
            event_address: {required: "Event Address is Required"},
            event_start_date: {required: "Event Date is Required"},
            event_time: {required: "Event Time is Required"},
            event_description: {required: "Event Description is Required"},
            event_email: {required: "Event Email ID is Required"},
            event_mobile: {required: "Phone Number is Required"}
        },

        submitHandler: function (form) { // for demo
            form.submit();
        }
    });
});

// Event Form validation ends

// Event Edit Form validation starts
$(document).ready(function () {
    $("#event_edit_form").validate({
        onfocusout: function (element) {
            $(element).valid();
        },
        rules: {
            event_name: {required: true},
            event_contact_name: {required: true},
            event_address: {required: true},
            event_start_date: {required: true},
            event_time: {required: true},
            event_description: {required: true},
            event_email: {required: true, email: true},
            event_mobile: {required: true}
        },
        messages: {

            event_name: {required: "Event Name is Required"},
            event_contact_name: {required: "Contact Person Name is Required"},
            event_address: {required: "Event Address is Required"},
            event_start_date: {required: "Event Date is Required"},
            event_time: {required: "Event Time is Required"},
            event_description: {required: "Event Description is Required"},
            event_email: {required: "Event Email ID is Required"},
            event_mobile: {required: "Phone Number is Required"}
        },

        submitHandler: function (form) { // for demo
            form.submit();
        }
    });
});

// Event Edit Form validation ends

// Blog Form validation starts
$(document).ready(function () {
    $("#blog_form").validate({
        onfocusout: function (element) {
            $(element).valid();
        },
        rules: {
            blog_name: {required: true},
            blog_image: {required: true},
            blog_description: {required: true}
        },
        messages: {

            blog_name: {required: "Blog Name is Required"},
            blog_image: {required: "Blog Image is Required"},
            blog_description: {required: "Blog Description is Required"}
        },

        submitHandler: function (form) { // for demo
            form.submit();
        }
    });
});

// Blog Form validation ends

// Blog Edit Form validation starts
$(document).ready(function () {
    $("#blog_edit_form").validate({
        onfocusout: function (element) {
            $(element).valid();
        },
        rules: {
            blog_name: {required: true},
            blog_description: {required: true}
        },
        messages: {

            blog_name: {required: "Blog Name is Required"},
            blog_description: {required: "Blog Description is Required"}
        },

        submitHandler: function (form) { // for demo
            form.submit();
        }
    });
});

// Blog Edit Form validation ends


<!--All Listing page Enquiry Form Ajax Call And Validation starts-->

$("#all_enquiry_submit").click(function () {

    $("#all_enquiry_form").validate({
        rules: {
            enquiry_name: {required: true},
            enquiry_email: {required: true, email: true},
            enquiry_mobile: {required: true}

        },
        messages: {

            enquiry_name: {required: "Name is Required"},
            enquiry_email: {required: "Email ID is Required"},
            enquiry_mobile: {required: "Mobile Number is Required"}
        },

        submitHandler: function (form) { // for demo
            //form.submit();

            if (webpage_full_link != null) {
                var link = webpage_full_link + 'enquiry_submit.php';
            } else {
                var link = 'enquiry_submit.php';
            }

            $.ajax({
                type: "POST",
                data: $("#all_enquiry_form").serialize(),
                url: link,
                cache: true,
                success: function (html) {
                    // alert(html);
                    if (html == 1) {
                        $("#enq_success").show();
                        $("#all_enquiry_form")[0].reset();
                    } else {
                        if (html == 3) {
                            $("#enq_same").show();
                            $("#all_enquiry_form")[0].reset();
                        } else {
                            $("#enq_fail").show();
                            $("#all_enquiry_form")[0].reset();
                        }
                    }

                }

            })
        }
    });
});
<!--All Listing page Enquiry Form Ajax Call And Validation ends-->

// User Ad Request Form validation starts
$(document).ready(function () {
    $("#create_ads_form").validate({
        onfocusout: function (element) {
            $(element).valid();
        },
        rules: {
            all_ads_price_id: {required: true},
            ad_start_date: {required: true},
            ad_end_date: {required: true},
            ad_enquiry_photo: {required: true},
            ad_link: {required: true}
        },
        messages: {

            all_ads_price_id: {required: "Ad Position is Required"},
            ad_start_date: {required: "Start Date is Required"},
            ad_end_date: {required: "End Date is Required"},
            ad_enquiry_photo: {required: "Ad is Required"},
            ad_link: {required: "Ad Link is Required"}
        },

        submitHandler: function (form) { // for demo
            form.submit();
        }
    });
});

// User Ad Request Form validation ends


<!--Home page slide Enquiry Form Ajax Call And Validation starts-->

$("#home_slide_enquiry_submit").click(function () {

    $("#home_slide_enquiry_form").validate({
        rules: {
            enquiry_name: {required: true},
            enquiry_email: {required: true, email: true},
            enquiry_mobile: {required: true}

        },
        messages: {

            enquiry_name: {required: "Name is Required"},
            enquiry_email: {required: "Email ID is Required"},
            enquiry_mobile: {required: "Mobile Number is Required"}
        },

        submitHandler: function (form) { // for demo

            $("#home_slide_enquiry_submit").html("Please Wait....");// or: this.value = "processing";
            $("#home_slide_enquiry_submit").prop('disabled', true); // no double submit ;)

            //form.submit();

            if (webpage_full_link != null) {
                var link = webpage_full_link + 'enquiry_submit.php';
            } else {
                var link = 'enquiry_submit.php';
            }

            $.ajax({
                type: "POST",
                data: $("#home_slide_enquiry_form").serialize(),
                url: link,
                cache: true,
                success: function (html) {
                    $("#home_slide_enquiry_submit").html("Submit Requirements");// or: this.value = "processing";
                    $("#home_slide_enquiry_submit").prop('disabled', false); // no double submit ;)
                    if (html == 1) {
                        $("#home_slide_enq_success").show();
                        $("#home_slide_enquiry_form")[0].reset();
                    } else {
                        if (html == 3) {
                            $("#home_slide_enq_same").show();
                            $("#home_slide_enquiry_form")[0].reset();
                        } else {
                            $("#home_slide_enq_fail").show();
                            $("#home_slide_enquiry_form")[0].reset();
                        }
                    }

                }

            })
        }
    });
});
<!--Home page slide Enquiry Form Ajax Call And Validation ends-->


<!--Home page Enquiry Form Ajax Call And Validation starts-->

$("#home_enquiry_submit").click(function () {

    $("#home_enquiry_form").validate({
        rules: {
            enquiry_name: {required: true},
            enquiry_email: {required: true, email: true},
            enquiry_mobile: {required: true}

        },
        messages: {

            enquiry_name: {required: "Name is Required"},
            enquiry_email: {required: "Email ID is Required"},
            enquiry_mobile: {required: "Mobile Number is Required"}
        },

        submitHandler: function (form) { // for demo
            //form.submit();

            if (webpage_full_link != null) {
                var link = webpage_full_link + 'enquiry_submit.php';
            } else {
                var link = 'enquiry_submit.php';
            }

            $.ajax({
                type: "POST",
                data: $("#home_enquiry_form").serialize(),
                url: link,
                cache: true,
                success: function (html) {
                    // alert(html);
                    if (html == 1) {
                        $("#home_enq_success").show();
                        $("#home_enquiry_form")[0].reset();
                    } else {
                        if (html == 3) {
                            $("#home_enq_same").show();
                            $("#home_enquiry_form")[0].reset();
                        } else {
                            $("#home_enq_fail").show();
                            $("#home_enquiry_form")[0].reset();
                        }
                    }

                }

            })
        }
    });
});
<!--Home page Enquiry Form Ajax Call And Validation ends-->


// product Form validation starts
$(document).ready(function () {
    $("#product_form").validate({
        onfocusout: function (element) {
            $(element).valid();
        },
        rules: {
            product_name: {required: true},
            product_price: {required: true},
            gallery_image: {required: true},
            product_description: {required: true},
            category_id: {required: true}
        },
        messages: {

            product_name: {required: "Product name is Required"},
            product_price: {required: "Product price is Required"},
            gallery_image: {required: "Product image is Required"},
            product_description: {required: "Product description is Required"},
            category_id: {required: "Product category is Required"}
        },

        submitHandler: function (form) { // for demo
            form.submit();
        }
    });
});

// product Form validation ends

// Feedback Form validation starts
$(document).ready(function () {
    $("#feedback_form").validate({
        onfocusout: function (element) {
            $(element).valid();
        },
        rules: {
            feedback_name: {required: true},
            feedback_email: {required: true, email: true},
            feedback_mobile: {required: true},
            feedback_message: {required: true}
        },
        messages: {

            feedback_name: {required: "Name is Required"},
            feedback_email: {required: "Email ID is Required"},
            feedback_mobile: {required: "Phone Number is Required"},
            feedback_message: {required: "Feedback is Required"}
        },

        submitHandler: function (form) { // for demo
            form.submit();
        }
    });
});

// Feedback Form validation ends

// Add Coupon Form validation starts
$(document).ready(function () {
    $("#coupon_form").validate({
        onfocusout: function (element) {
            $(element).valid();
        },
        rules: {
            coupon_name: {required: true},
            coupon_code: {required: true},
            coupon_photo: {required: true},
            coupon_start_date: {required: true},
            coupon_end_date: {required: true}
        },
        messages: {

            coupon_name: {required: "Coupon Name is Required"},
            coupon_code: {required: "Offer Code is Required"},
            coupon_photo: {required: "Coupon Photo is Required"},
            coupon_start_date: {required: "Start date is Required"},
            coupon_end_date: {required: "End date is Required"}
        },

        submitHandler: function (form) { // for demo
            form.submit();
        }
    });
});

// Add Coupon Form validation ends

// Edit Coupon Form validation starts
$(document).ready(function () {
    $("#edit_coupon_form").validate({
        onfocusout: function (element) {
            $(element).valid();
        },
        rules: {
            coupon_name: {required: true},
            coupon_code: {required: true},
            coupon_start_date: {required: true},
            coupon_end_date: {required: true}
        },
        messages: {

            coupon_name: {required: "Coupon Name is Required"},
            coupon_code: {required: "Offer Code is Required"},
            coupon_start_date: {required: "Start date is Required"},
            coupon_end_date: {required: "End date is Required"}
        },

        submitHandler: function (form) { // for demo
            form.submit();
        }
    });
});

// Edit Coupon Form validation ends


//
<!--Review Form Ajax Call And Validation starts-->

$("#review_submit").click(function () {
    $("#review_form").validate({
        rules: {
            rating: {required: true},
            review_name: {required: true},
            review_email: {required: true, email: true},
            review_mobile: {required: true},
            review_message: {required: true}

        },
        messages: {
            rating: {required: "Rating is Required"},
            review_name: {required: "Name is Required"},
            review_email: {required: "Email ID is Required"},
            review_mobile: {required: "Mobile Number is Required"},
            review_message: {required: "Write Some review"}
        },

        submitHandler: function (form) { // for demo
            //form.submit();

            if (webpage_full_link != null) {
                var link = webpage_full_link + 'review_submit.php';
            } else {
                var link = 'review_submit.php';
            }

            $.ajax({
                type: "POST",
                data: $("#review_form").serialize(),
                url: link,
                cache: true,
                success: function (html) {
                    //  alert(html);
                    if (html == 1) {
                        $("#review_success").show();
                        $("#review_form")[0].reset();
                    } else {
                        $("#review_fail").show();
                        $("#review_form")[0].reset();
                    }

                }

            })
        }
    });
});
<!--Review Form Ajax Call And Validation ends-->

<!--Pop Up Claim Form Detail Page Ajax Call And Validation starts-->
// $("#popup_claim_submit").click(function () {
$('#popup_claim_form').click(function () {
    // evt.preventDefault();


    $("#popup_claim_form").validate({
        rules: {
            enquiry_name: {required: true},
            enquiry_image: {required: true},
            enquiry_email: {required: true, email: true},
            enquiry_mobile: {required: true}

        },
        messages: {

            enquiry_name: {required: "Name is Required"},
            enquiry_image: {required: "Identification Proof is Required"},
            enquiry_email: {required: "Your Business Email ID is Required"},
            enquiry_mobile: {required: "Mobile Number is Required"}
        },

        submitHandler: function (form) { // for demo
            //form.submit();
            var formData = new FormData(form);

            if (webpage_full_link != null) {
                var link = webpage_full_link + 'claim_submit.php';
            } else {
                var link = 'claim_submit.php';
            }

            // alert(formData);

            $.ajax({
                type: "POST",
                // data: $("#popup_claim_form").serialize(),
                url: link,
                data: formData,
                cache: false,
                contentType: false,
                processData: false,
                success: function (html) {
                    //alert(html);
                    if (html == 1) {
                        $("#pop_claim_success").show();
                        $("#popup_claim_form")[0].reset();
                    } else {
                        if (html == 3) {
                            $("#pop_claim_same").show();
                            $("#popup_claim_form")[0].reset();
                        } else {
                            $("#pop_claim_fail").show();
                            $("#popup_claim_form")[0].reset();
                        }
                    }

                }

            })
        }
    });
});
<!--Pop Up Claim Form Detail Page Ajax Call And Validation ends-->


<!--Pop Up Enquiry Form Detail Page Ajax Call And Validation starts-->
$("#popup_enquiry_submit").click(function () {
    $("#popup_enquiry_form").validate({
        rules: {
            enquiry_name: {required: true},
            enquiry_email: {required: true, email: true},
            enquiry_mobile: {required: true}

        },
        messages: {

            enquiry_name: {required: "Name is Required"},
            enquiry_email: {required: "Email ID is Required"},
            enquiry_mobile: {required: "Mobile Number is Required"}
        },

        submitHandler: function (form) { // for demo
            //form.submit();

            if (webpage_full_link != null) {
                var link = webpage_full_link + 'enquiry_submit.php';
            } else {
                var link = 'enquiry_submit.php';
            }

            $.ajax({
                type: "POST",
                data: $("#popup_enquiry_form").serialize(),
                url: link,
                cache: true,
                success: function (html) {
                    // alert(html);
                    if (html == 1) {
                        $("#pop_enq_success").show();
                        $("#popup_enquiry_form")[0].reset();
                    } else {
                        if (html == 3) {
                            $("#pop_enq_same").show();
                            $("#popup_enquiry_form")[0].reset();
                        } else {
                            $("#pop_enq_fail").show();
                            $("#popup_enquiry_form")[0].reset();
                        }
                    }

                }

            })
        }
    });
});
<!--Pop Up Enquiry Form Detail Page Ajax Call And Validation ends-->


<!--Pop Up All Service Expert Enquiry Form Ajax Call And Validation starts-->
$("#expert_all_enquiry_submit").click(function () {
    $("#expert_all_enquiry_form").validate({
        rules: {
            enquiry_name: {required: true},
            enquiry_email: {required: true, email: true},
            enquiry_mobile: {required: true},
            enquiry_location: {required: true},
            enquiry_date: {required: true},
            enquiry_time: {required: true}


        },
        messages: {
            enquiry_name: {required: "Name is Required"},
            enquiry_email: {required: "Email ID is Required"},
            enquiry_mobile: {required: "Mobile Number is Required"},
            enquiry_location: {required: "Your Location is Required"},
            enquiry_date: {required: "Appointment Date is Required"},
            enquiry_time: {required: "Appointment Time is Required"}
        },

        submitHandler: function (form) { // for demo
            //form.submit();

            if (webpage_full_link != null) {
                var link = webpage_full_link + 'service-experts/expert_enquiry_submit.php';
            } else {
                var link = 'service-experts/expert_enquiry_submit.php';
            }

            if (webpage_full_link != null) {
                var redirect_link = webpage_full_link + 'service-experts/service-confirmation?code=';
            } else {
                var redirect_link = 'service-experts/service-confirmation?code=';
            }

            $.ajax({
                type: "POST",
                data: $("#expert_all_enquiry_form").serialize(),
                url: link,
                cache: true,
                success: function (html) {
                    // alert(html);
                    if (html == 500500) {
                        $("#expert_pop_enq_fail").show();
                        $("#expert_all_enquiry_form")[0].reset();
                    } else {
                        if (html == 403403) {
                            $("#expert_pop_enq_same").show();
                            $("#expert_all_enquiry_form")[0].reset();
                        } else {
                            $("#expert_pop_enq_success").show();
                            $("#expert_all_enquiry_form")[0].reset();
                            window.location.href = redirect_link + html + "&&enquiry=success";
                        }
                    }

                }

            })
        }
    });
});
<!--Pop Up All Service Expert Enquiry Form Ajax Call And Validation ends-->

<!--Pop Up Detail Service Expert Enquiry Form Ajax Call And Validation starts-->
$("#expert_detail_enquiry_submit").click(function () {
    $("#expert_detail_enquiry_form").validate({
        rules: {
            enquiry_name: {required: true},
            enquiry_email: {required: true, email: true},
            enquiry_mobile: {required: true},
            enquiry_location: {required: true},
            enquiry_date: {required: true},
            enquiry_time: {required: true}


        },
        messages: {
            enquiry_name: {required: "Name is Required"},
            enquiry_email: {required: "Email ID is Required"},
            enquiry_mobile: {required: "Mobile Number is Required"},
            enquiry_location: {required: "Your Location is Required"},
            enquiry_date: {required: "Appointment Date is Required"},
            enquiry_time: {required: "Appointment Time is Required"}
        },

        submitHandler: function (form) { // for demo
            //form.submit();

            if (webpage_full_link != null) {
                var link = webpage_full_link + 'service-experts/expert_enquiry_submit.php';
            } else {
                var link = 'service-experts/expert_enquiry_submit.php';
            }

            if (webpage_full_link != null) {
                var redirect_link = webpage_full_link + 'service-experts/service-confirmation?code=';
            } else {
                var redirect_link = 'service-experts/service-confirmation?code=';
            }

            $.ajax({
                type: "POST",
                data: $("#expert_detail_enquiry_form").serialize(),
                url: link,
                cache: true,
                success: function (html) {
                    // alert(html);
                    if (html == 500500) {
                        $("#expert_detail_enq_fail").show();
                        $("#expert_detail_enquiry_form")[0].reset();
                    } else {
                        if (html == 403403) {
                            $("#expert_detail_enq_same").show();
                            $("#expert_detail_enquiry_form")[0].reset();
                        } else {
                            $("#expert_detail_enq_success").show();
                            $("#expert_detail_enquiry_form")[0].reset();
                            window.location.href = redirect_link + html + "&&enquiry=success";
                        }
                    }

                }

            })
        }
    });
});
<!--Pop Up Detail Service Expert Enquiry Form Ajax Call And Validation ends-->

<!--Pop Up Job Enquiry Form Detail Page Ajax Call And Validation starts-->
$("#popup_job_enquiry_submit").click(function () {
    $("#popup_job_enquiry_form").validate({
        rules: {
            enquiry_name: {required: true},
            enquiry_email: {required: true, email: true},
            enquiry_mobile: {required: true}

        },
        messages: {

            enquiry_name: {required: "Name is Required"},
            enquiry_email: {required: "Email ID is Required"},
            enquiry_mobile: {required: "Mobile Number is Required"}
        },

        submitHandler: function (form) { // for demo
            //form.submit();

            if (webpage_full_link != null) {
                var link = webpage_full_link + 'jobs/job_enquiry_submit.php';
            } else {
                var link = 'jobs/job_enquiry_submit.php';
            }

            $.ajax({
                type: "POST",
                data: $("#popup_job_enquiry_form").serialize(),
                url: link,
                cache: true,
                success: function (html) {
                    // alert(html);
                    if (html == 1) {
                        $("#pop_enq_success").show();
                        $("#popup_job_enquiry_form")[0].reset();
                    } else {
                        if (html == 3) {
                            $("#pop_enq_same").show();
                            $("#popup_job_enquiry_form")[0].reset();
                        }
                        if (html == 4) {
                            $("#pop_enq_no_profile").show();
                            $("#popup_enquiry_form")[0].reset();
                        }
                        if (html == 5) {
                            $("#pop_enq_already_applied").show();
                            $("#popup_enquiry_form")[0].reset();
                        } else {
                            $("#pop_enq_fail").show();
                            $("#popup_job_enquiry_form")[0].reset();
                        }
                    }

                }

            })
        }
    });
});
<!--Pop Up Job Enquiry Form Detail Page Ajax Call And Validation ends-->

<!-- Enquiry Form Detail Page Ajax Call And Validation starts-->
$("#detail_enquiry_submit").click(function () {
    $("#detail_enquiry_form").validate({
        rules: {
            enquiry_name: {required: true},
            enquiry_email: {required: true, email: true},
            enquiry_mobile: {required: true}

        },
        messages: {

            enquiry_name: {required: "Name is Required"},
            enquiry_email: {required: "Email ID is Required"},
            enquiry_mobile: {required: "Mobile Number is Required"}
        },

        submitHandler: function (form) { // for demo
            //form.submit();

            if (webpage_full_link != null) {
                var link = webpage_full_link + 'enquiry_submit.php';
            } else {
                var link = 'enquiry_submit.php';
            }

            $.ajax({
                type: "POST",
                data: $("#detail_enquiry_form").serialize(),
                url: link,
                cache: true,
                success: function (html) {
                    // alert(html);
                    if (html == 1) {
                        $("#detail_enq_success").show();
                        $("#detail_enquiry_form")[0].reset();
                    } else {
                        if (html == 3) {
                            $("#detail_enq_same").show();
                            $("#detail_enquiry_form")[0].reset();
                        } else {
                            $("#detail_enq_fail").show();
                            $("#detail_enquiry_form")[0].reset();
                        }
                    }

                }

            })
        }
    });
});
<!--Enquiry Form Detail Page Ajax Call And Validation ends-->

// Promotion Listing Form validation starts
$(document).ready(function () {
    $("#create_promote_form").validate({
        onfocusout: function (element) {
            $(element).valid();
        },
        rules: {
            type_id: {required: true},
            ad_start_date: {required: true},
            ad_end_date: {required: true}
        },
        messages: {

            type_id: {required: "Listing Name is Required"},
            ad_start_date: {required: "Start Date is Required"},
            ad_end_date: {required: "End Date is Required"}
        },

        submitHandler: function (form) { // for demo
            form.submit();
        }
    });
});

//Promotion Listing Form validation ends


// Buy Points Form validation starts
$(document).ready(function () {
    $("#buy_points_form").validate({
        onfocusout: function (element) {
            $(element).valid();
        },
        rules: {
            new_points: {required: true}
        },
        messages: {

            new_points: {required: "Points to buy is Required"}
        },

        submitHandler: function (form) { // for demo
            form.submit();
        }
    });
});

// Buy Points validation ends


<!--All product page Enquiry Form Ajax Call And Validation starts-->

$(".all_product_enquiry_submit").click(function () {

    $(".all_product_enquiry_form").validate({
        rules: {
            enquiry_name: {required: true},
            enquiry_email: {required: true, email: true},
            enquiry_mobile: {required: true}

        },
        messages: {

            enquiry_name: {required: "Name is Required"},
            enquiry_email: {required: "Email ID is Required"},
            enquiry_mobile: {required: "Mobile Number is Required"}
        },

        submitHandler: function (form) { // for demo
            //form.submit();

            if (webpage_full_link != null) {
                var link = webpage_full_link + 'enquiry_submit.php';
            } else {
                var link = 'enquiry_submit.php';
            }

            $.ajax({
                type: "POST",
                data: $(".all_product_enquiry_form").serialize(),
                url: link,
                cache: true,
                success: function (html) {
                    // alert(html);
                    if (html == 1) {
                        $("#enq_success").show();
                        $(".all_product_enquiry_form")[0].reset();
                    } else {
                        if (html == 3) {
                            $("#enq_same").show();
                            $(".all_product_enquiry_form")[0].reset();
                        } else {
                            $("#enq_fail").show();
                            $(".all_product_enquiry_form")[0].reset();
                        }
                    }

                }

            })
        }
    });
});
<!--All Listing page Enquiry Form Ajax Call And Validation ends-->

// Installation Form validation starts
$(document).ready(function () {
    $("#install_form").validate({
        onfocusout: function (element) {
            $(element).valid();
        },
        rules: {
            website_name: {required: true},
            website_url: {required: true},
            admin_user_name: {required: true},
            admin_user_email_id: {required: true, email: true},
            admin_currency: {required: true},
            admin_user_password: {required: true},
            admin_confirm_password: {
                required: true,
                equalTo: "#admin_user_password"
            }

        },
        messages: {

            website_name: {required: "Website Name is Required"},
            website_url: {required: "Website URL is Required"},
            admin_user_name: {required: "Admin User Name is Required"},
            admin_user_email_id: {required: "Admin Email ID is Required"},
            admin_currency: {required: "Curency Symbol is Required"},
            admin_user_password: {required: "Admin Password is Required"},
            admin_confirm_password: {required: "Confirm Password is Required"}
        },

        submitHandler: function (form) { // for demo
            form.submit();
        }
    });
});

// Installation Form validation ends


// Job Creation Form validation starts
$(document).ready(function () {
    $("#job_form").validate({
        onfocusout: function (element) {
            $(element).valid();
        },
        rules: {
            job_title: {required: true},
            job_salary: {required: true},
            no_of_openings: {required: true}
        },
        messages: {

            job_title: {required: "Job Title is Required"},
            job_salary: {required: "Salary is Required"},
            no_of_openings: {required: "No. Of Openings is Required"}
        },

        submitHandler: function (form) { // for demo
            form.submit();
        }
    });
});

// Job Creation Form validation ends


//
<!--Expert Review Form Ajax Call And Validation starts-->

$("#expert_review_submit").click(function () {
    $("#expert_review_form").validate({
        rules: {
            expert_rating: {required: true}

        },
        messages: {
            expert_rating: {required: "Rating is Required"}
        },

        submitHandler: function (form) { // for demo
            //form.submit();

            if (webpage_full_link != null) {
                var link = webpage_full_link + 'service-experts/expert_review_submit.php';
            } else {
                var link = 'service-experts/expert_review_submit.php';
            }

            $.ajax({
                type: "POST",
                data: $("#expert_review_form").serialize(),
                url: link,
                cache: true,
                success: function (html) {
                    //  alert(html);
                    if (html == 1) {
                        $("#expert_review_success").show();
                        $("#expert_review_form")[0].reset();
                        setTimeout(function () {
                            $('#expwrirevi').modal('hide');
                        }, 2000);
                    } else {
                        $("#expert_review_fail").show();
                        $("#expert_review_form")[0].reset();
                    }

                }

            })
        }
    });
});
<!--Expert Review Form Ajax Call And Validation ends-->


<!--Expert Service Cancel Form Ajax Call And Validation starts-->

$("#expert_service_cancel_submit").click(function () {
    $("#expert_service_cancel_form").validate({
        rules: {
            cancel_message: {required: true}

        },
        messages: {
            cancel_message: {required: "Cancel Message is Required"}
        },

        submitHandler: function (form) { // for demo
            //form.submit();

            if (webpage_full_link != null) {
                var link = webpage_full_link + 'service-experts/expert_cancel_submit.php';
            } else {
                var link = 'service-experts/expert_cancel_submit.php';
            }

            $.ajax({
                type: "POST",
                data: $("#expert_service_cancel_form").serialize(),
                url: link,
                cache: true,
                success: function (html) {
                    // alert(html);
                    if (html == 500500) {
                        $("#expert_cancel_fail").show();
                        $("#expert_service_cancel_form")[0].reset();
                    } else {
                        if (html == 403403) {
                            $("#expert_cancel_fail").show();
                            $("#expert_service_cancel_form")[0].reset();
                        } else {
                            $("#expert_cancel_success").show();
                            $("#expert_service_cancel_form")[0].reset();
                        }
                    }

                }

            })
        }
    });
});
<!--Expert Service Cancel Form Ajax Call And Validation ends-->

<!--Expert Service Update Availability Form Ajax Call And Validation starts-->

$("#expert_availability_submit").click(function () {
    $("#expert_availability_form").validate({
        rules: {
            available_time_start: {required: true},
            available_time_end: {required: true}

        },
        messages: {
            available_time_start: {required: "Start time is Required"},
            available_time_end: {required: "End time is Required"}
        },

        submitHandler: function (form) { // for demo
            //form.submit();

            if (webpage_full_link != null) {
                var link = webpage_full_link + 'service-experts/expert_availability_update.php';
            } else {
                var link = 'service-experts/expert_availability_update.php';
            }

            $.ajax({
                type: "POST",
                data: $("#expert_availability_form").serialize(),
                url: link,
                cache: true,
                success: function (html) {
                    // alert(html);
                    if (html == 500500) {
                        $("#expert_availability_fail").show();
                        $("#expert_availability_form")[0].reset();
                    } else {
                        if (html == 403403) {
                            $("#expert_availability_fail").show();
                            $("#expert_availability_form")[0].reset();
                        } else {
                            $("#expert_availability_success").show();
                            $("#expert_availability_form")[0].reset();
                        }
                    }

                }

            })
        }
    });
});
<!--Expert Service Update Availability Form Ajax Call And Validation ends-->


<!--Pop Up All Service Expert Enquiry Common Form Ajax Call And Validation starts-->
$("#expert_all_enquiry_common_submit").click(function () {
    $("#expert_all_enquiry_common_form").validate({
        rules: {
            enquiry_name: {required: true},
            enquiry_email: {required: true, email: true},
            enquiry_mobile: {required: true},
            enquiry_location: {required: true},
            enquiry_date: {required: true},
            enquiry_time: {required: true}


        },
        messages: {
            enquiry_name: {required: "Name is Required"},
            enquiry_email: {required: "Email ID is Required"},
            enquiry_mobile: {required: "Mobile Number is Required"},
            enquiry_location: {required: "Your Location is Required"},
            enquiry_date: {required: "Appointment Date is Required"},
            enquiry_time: {required: "Appointment Time is Required"}
        },

        submitHandler: function (form) { // for demo
            //form.submit();

            if (webpage_full_link != null) {
                var link = webpage_full_link + 'service-experts/expert_enquiry_submit.php';
            } else {
                var link = 'service-experts/expert_enquiry_submit.php';
            }

            if (webpage_full_link != null) {
                var redirect_link = webpage_full_link + 'service-experts/service-confirmation?code=';
            } else {
                var redirect_link = 'service-experts/service-confirmation?code=';
            }

            $.ajax({
                type: "POST",
                data: $("#expert_all_enquiry_common_form").serialize(),
                url: link,
                cache: true,
                success: function (html) {
                    // alert(html);
                    if (html == 500500) {
                        $("#expert_pop_enq_common_fail").show();
                        $("#expert_all_enquiry_common_form")[0].reset();
                    } else {
                        if (html == 403403) {
                            $("#expert_pop_enq_common_same").show();
                            $("#expert_all_enquiry_common_form")[0].reset();
                        } else {
                            $("#expert_pop_enq_common_success").show();
                            $("#expert_all_enquiry_common_form")[0].reset();
                        }
                    }

                }

            })
        }
    });
});
<!--Pop Up All Service Expert Enquiry Common Form Ajax Call And Validation ends-->


<!--News Module Newsletter Subscribe Form Ajax Call And Validation starts-->

$("#news_newsletter_subscribe_submit").click(function () {

    $("#news_newsletter_subscribe_form").validate({
        rules: {

            news_newsletter_subscribe_name: {required: true, email: true}
        },
        messages: {

            news_newsletter_subscribe_name: {required: "Email ID is Required"}
        },

        submitHandler: function (form) { // for demo
            //form.submit();

            if (webpage_full_link != null) {
                var link = webpage_full_link + 'news/newsletter_enquiry_submit.php';
            } else {
                var link = 'news/newsletter_enquiry_submit.php';
            }

            $.ajax({
                type: "POST",
                data: $("#news_newsletter_subscribe_form").serialize(),
                url: link,
                cache: true,
                success: function (html) {
                    // alert(html);
                    if (html == 1) {
                        $("#news_newsletter_success").show();
                        $("#news_newsletter_subscribe_form")[0].reset();
                    } else {
                        $("#news_newsletter_fail").show();
                        $("#news_newsletter_subscribe_form")[0].reset();
                    }

                }

            })
        }
    });
});
<!--News Module Newsletter Subscribe Form Ajax Call And Validation ends-->



<!--Place page Add Request Form Ajax Call And Validation starts-->

$(".place_add_request_submit").click(function () {

    $(".place_add_request_form").validate({
        rules: {
            place_name: {required: true},
            place_address: {required: true},
            place_image: {required: true},
            enquiry_name: {required: true},
            enquiry_email: {required: true, email: true},
            enquiry_mobile: {required: true}

        },
        messages: {
            place_name: {required: "Place Name is Required"},
            place_address: {required: "Place Address is Required"},
            place_image: {required: "Place Photo is Required"},
            enquiry_name: {required: "Name is Required"},
            enquiry_email: {required: "Email ID is Required"},
            enquiry_mobile: {required: "Mobile Number is Required"}
        },

        submitHandler: function (form) { // for demo
            //form.submit();

            if (webpage_full_link != null) {
                var link = webpage_full_link + 'places/place_add_submit.php';
            } else {
                var link = 'places/place_add_submit.php';
            }

            $.ajax({
                type: "POST",
                data: $(".place_add_request_form").serialize(),
                url: link,
                cache: true,
                success: function (html) {
                    // alert(html);
                    if (html == 1) {
                        $("#place_pop_enq_success").show();
                        $(".place_add_request_form")[0].reset();
                    } else {
                        if (html == 3) {
                            $("#enq_same").show();
                            $(".place_add_request_form")[0].reset();
                        } else {
                            $("#place_pop_enq_fail").show();
                            $(".place_add_request_form")[0].reset();
                        }
                    }

                }

            })
        }
    });
});
<!--Place page Add Request Form Ajax Call And Validation ends-->

