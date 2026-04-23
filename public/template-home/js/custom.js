if ($(".b-lazy").length > 0) {
    var bLazy = new Blazy({});
}
// Attach event listener to all file input fields
document.querySelectorAll('.file-input').forEach((input) => {
    input.addEventListener('change', function (event) {
        const file = event.target.files[0]; // Get the selected file
        const siblingPreview = this.parentElement.querySelector('.img-preview'); // Find the sibling with class 'img-preview'

        // Check if a file is selected and the sibling is a valid img-preview element
        if (file && siblingPreview && siblingPreview.tagName === 'IMG') {
            const reader = new FileReader();
            reader.onload = function (e) {
                siblingPreview.src = e.target.result; // Set the preview image source
            };
            reader.readAsDataURL(file); // Read the file as a Data URL
        } else if (siblingPreview && siblingPreview.tagName === 'IMG') {
            siblingPreview.src = ''; // Clear the preview if no file is selected
        }
    });
});

$(document).ready(function () {
    "use strict";

    //ONCE YOU HAVE DYNAMICALLY SET THE MENU YOU HAVE TO REMOVE THIS
    $(".pop-menu").html('<div class="container"><div class="row"><div class="pmenu-spri"><ul><li><a href="all-category.html" class="act"><img src="images/icon/shop.png" loading="lazy">All Services </a></li><li><a href="classifieds/index.html"><img src="images/icon/ads.png" loading="lazy">Classified Ads </a></li><li><a href="service-experts/index.html"><img src="images/icon/expert.png" loading="lazy">Service Experts </a></li><li><a href="jobs/index.html"><img src="images/icon/employee.png" loading="lazy">Jobs </a></li><li><a href="places/index.html"><img src="images/places/icons/hot-air-balloon.png" loading="lazy">Explore Travel </a></li><li><a href="news/index.html"><img src="images/icon/news.png" loading="lazy">News & Magazines </a></li><li><a href="events.html"><img src="images/icon/calendar.png" loading="lazy">Events </a></li><li><a href="products.html"><img src="images/icon/cart.png" loading="lazy">Products </a></li><li><a href="coupons.html"><img src="images/icon/coupons.png" loading="lazy">Coupon & deals </a></li><li><a href="blog-posts.html"><img src="images/icon/blog1.png" loading="lazy">Blogs </a></li><li><a href="community.html"><img src="images/icon/11.png" loading="lazy">Community </a></li></ul></div><div class="pmenu-cat"><i class="material-icons clopme">close</i><h4>All Categories</h4><input type="text" id="pg-sear" placeholder="Search category"><ul id="pg-resu"><li><a href="all-listing.html">Spa and Facial -<span>05</span></a></li><li><a href="all-listing.html">Wedding halls -<span>00</span></a></li><li><a href="all-listing.html">Automobiles -<span>05</span></a></li><li><a href="all-listing.html">Restaurants -<span>01</span></a></li><li><a href="all-listing.html">Technology -<span>04</span></a></li><li><a href="all-listing.html">Pet shop -<span>00</span></a></li><li><a href="all-listing.html">Real Estate -<span>05</span></a></li><li><a href="all-listing.html">Sports -<span>00</span></a></li><li><a href="all-listing.html">Hospitals -<span>06</span></a></li><li><a href="all-listing.html">Education -<span>06</span></a></li><li><a href="all-listing.html">Transportation -<span>05</span></a></li><li><a href="all-listing.html">Electricals -<span>04</span></a></li></ul></div><div class="dir-home-nav-bot"><ul><li>A few reasons you’ll love Online Business Directory <span>Call us on: +01 6214 6548</span></li><li><a href="post-your-ads.html" class="waves-effect waves-light btn-large"><i class="material-icons">font_download</i> Advertise with us </a></li><li><a href="pricing-details.html" class="waves-effect waves-light btn-large"><i class="material-icons">store</i> Add your business </a></li></ul></div></div></div>');

    //ONCE YOU HAVE DYNAMICALLY SET THE MENU YOU HAVE TO REMOVE THIS
    $(".pop-menu-inn").html('<div class="container"><div class="row"><div class="pmenu-spri"><ul><li><a href="../all-category.html" class="act"><img src="../images/icon/shop.png" loading="lazy">All Services </a></li><li><a href="../classifieds/index.html"><img src="../images/icon/ads.png" loading="lazy">Classified Ads </a></li><li><a href="../service-experts/index.html"><img src="../images/icon/expert.png" loading="lazy">Service Experts </a></li><li><a href="../jobs/index.html"><img src="../images/icon/employee.png" loading="lazy">Jobs </a></li><li><a href="../places/index.html"><img src="../images/places/icons/hot-air-balloon.png" loading="lazy">Explore Travel </a></li><li><a href="../news/index.html"><img src="../images/icon/news.png" loading="lazy">News & Magazines </a></li><li><a href="../events.html"><img src="../images/icon/calendar.png" loading="lazy">Events </a></li><li><a href="../products.html"><img src="../images/icon/cart.png" loading="lazy">Products </a></li><li><a href="../coupons.html"><img src="../images/icon/coupons.png" loading="lazy">Coupon & deals </a></li><li><a href="../blog-posts.html"><img src="../images/icon/blog1.png" loading="lazy">Blogs </a></li><li><a href="../community.html"><img src="../images/icon/11.png" loading="lazy">Community </a></li></ul></div><div class="pmenu-cat"><i class="material-icons clopme">close</i><h4>All Categories</h4><input type="text" id="pg-sear" placeholder="Search category"><ul id="pg-resu"><li><a href="../all-listing.html">Spa and Facial -<span>05</span></a></li><li><a href="../all-listing.html">Wedding halls -<span>00</span></a></li><li><a href="../all-listing.html">Automobiles -<span>05</span></a></li><li><a href="../all-listing.html">Restaurants -<span>01</span></a></li><li><a href="../all-listing.html">Technology -<span>04</span></a></li><li><a href="../all-listing.html">Pet shop -<span>00</span></a></li><li><a href="../all-listing.html">Real Estate -<span>05</span></a></li><li><a href="../all-listing.html">Sports -<span>00</span></a></li><li><a href="../all-listing.html">Hospitals -<span>06</span></a></li><li><a href="../all-listing.html">Education -<span>06</span></a></li><li><a href="../all-listing.html">Transportation -<span>05</span></a></li><li><a href="../all-listing.html">Electricals -<span>04</span></a></li></ul></div><div class="dir-home-nav-bot"><ul><li>A few reasons you’ll love Online Business Directory <span>Call us on: +01 6214 6548</span></li><li><a href="../post-your-ads.html" class="waves-effect waves-light btn-large"><i class="material-icons">font_download</i> Advertise with us </a></li><li><a href="../pricing-details.html" class="waves-effect waves-light btn-large"><i class="material-icons">store</i> Add your business </a></li></ul></div></div></div>');

    $(".ud-lhs-s2").html('<ul><li><a href="dashboard.html" class="db-lact"><img loading="lazy" src="images/icon/dbl1.png" alt=""> My Dashboard</a></li><li><h4>All Modules</h4><a href="db-all-listing.html"><img loading="lazy" src="images/icon/shop.png" alt="">All Listings</a></li><li><a href="db-ad-posts.html"><img loading="lazy" src="images/icon/ads.png" alt="">Ads Posts</a></li><li><a href="db-jobs.html"><img loading="lazy" src="images/icon/employee.png" alt="">Jobs</a></li><li><a href="db-products.html"><img loading="lazy" src="images/icon/cart.png" alt="">All Products</a></li><li><a href="db-events.html"><img loading="lazy" src="images/icon/calendar.png" alt="">Events</a></li><li><a href="db-blog-posts.html"><img loading="lazy" src="images/icon/blog1.png" alt="">Blog posts</a></li><li><a href="db-coupons.html"><img loading="lazy" src="images/icon/coupons.png" alt="">Coupons</a></li><li><h4>LEADS &amp; ENQUIRY</h4><a href="db-enquiry.html"><img loading="lazy" src="images/icon/tick.png" alt="">Lead enquiry</a></li><li><a href="db-service-expert.html"><img src="images/icon/expert.png" alt="">Service Expert Leads</a></li><li><h4>Payment &amp; Promotions</h4><a href="db-payment.html"><img loading="lazy" src="images/icon/dbl9.png" alt="">Payment &amp; plan</a></li><li><a href="db-promote.html"><img loading="lazy" src="images/icon/promotion.png" alt="">Promotions</a></li><li><a href="db-seo.html"><img loading="lazy" src="images/icon/seo.png" alt="">SEO</a></li><li><a href="db-point-history.html"><img loading="lazy" src="images/icon/point.png" alt="">Points History</a></li><li><a href="db-post-ads.html"><img loading="lazy" src="images/icon/dbl11.png" alt="">Ad Summary</a></li><li><a href="db-invoice-all.html"><img loading="lazy" src="images/icon/dbl16.png" alt="">Payment invoice</a></li><li><h4>Profile pages</h4><a href="db-my-profile.html"><img loading="lazy" src="images/icon/profile.png" alt="">My Profile</a></li><li><a href="create-service-expert-profile.html"><img loading="lazy" src="images/icon/profile.png" alt="">Service Expert Profile</a></li><li><a href="create-job-seeker-profile.html"><img loading="lazy" src="images/icon/profile.png" alt="">Job Profile</a></li><li><h4>My activities</h4><a href="db-user-applied-jobs.html"><img src="images/icon/job-apply.png" alt="">All Applied Jobs</a></li><li><a href="db-my-service-bookings.html"><img src="images/icon/expert-book.png" alt="">My Service Bookings</a></li><li><a href="db-review.html"><img loading="lazy" src="images/icon/dbl13.png" alt="">Reviews</a></li><li><a href="db-like-listings.html"><img loading="lazy" src="images/icon/dbl15.png" alt="">Liked Listings</a></li><li><a href="db-followings.html"><img loading="lazy" src="images/icon/dbl18.png" alt="">Followings</a></li><li><a href="db-notifications.html"><img loading="lazy" src="images/icon/dbl19.png" alt="">Notifications</a></li><li><h4>Settings</h4><a href="db-setting.html"><img loading="lazy" src="images/icon/dbl210.png" alt="">Setting</a></li><li><a href="how-to.html" target="_blank"><img loading="lazy" src="images/icon/dbl17.png" alt="">How tos</a></li><li><a href="logout.html"><img loading="lazy" src="images/icon/dbl12.png" alt="">Log Out</a></li></ul>');

    $(".fqui-menu").html('<ul><li><span class="mob-me-ic mob-me-fot"><i>&nbsp;</i><i>&nbsp;</i><i>&nbsp;</i>Menu</span></li><li><a href="index.html"><img src="images/icon/home.png">Home</a></li><li><span class="mob-sear"><img src="images/icon/search1.png">Search</span></li><li><a href="all-category.html" class="act"><img src="images/icon/shop.png">All Services</a></li><li><a href="classifieds/index.html"><img src="images/icon/ads.png">Classifieds</a></li><li><a href="service-experts/index.html"><img src="images/icon/expert.png">Service Experts</a></li><li><a href="jobs/index.html"><img src="images/icon/employee.png">Jobs</a></li><li><a href="events.html"><img src="images/icon/calendar.png">Events</a></li><li><a href="products.html"><img src="images/icon/cart.png">Products</a></li><li><a href="coupons.html"><img src="images/icon/coupons.png">Coupons</a></li><li><a href="blog-posts.html"><img src="images/icon/blog1.png">Blogs</a></li><li><a href="community.html"><img src="images/icon/11.png">Community</a></li><li><span class="btn-ser-need-ani"><img src="images/icon/how1.png">Support</span></li></ul>');

    $(".fqui-menu-sub").html('<ul><li><span class="mob-me-ic mob-me-fot"><i>&nbsp;</i><i>&nbsp;</i><i>&nbsp;</i>Menu</span></li><li><a href="../index.html"><img src="../images/icon/home.png">Home</a></li><li><span class="mob-sear"><img src="../images/icon/search1.png">Search</span></li><li><a href="../all-category.html" class="act"><img src="../images/icon/shop.png">All Services</a></li><li><a href="../classifieds/index.html"><img src="../images/icon/ads.png">Classifieds</a></li><li><a href="../service-experts/index.html"><img src="../images/icon/expert.png">Service Experts</a></li><li><a href="../jobs/index.html"><img src="../images/icon/employee.png">Jobs</a></li><li><a href="../events.html"><img src="../images/icon/calendar.png">Events</a></li><li><a href="../products.html"><img src="../images/icon/cart.png">Products</a></li><li><a href="../coupons.html"><img src="../images/icon/coupons.png">Coupons</a></li><li><a href="../blog-posts.html"><img src="../images/icon/blog1.png">Blogs</a></li><li><a href="../community.html"><img src="../images/icon/11.png">Community</a></li><li><span class="btn-ser-need-ani"><img src="../images/icon/how1.png">Support</span></li></ul>');

    $("#tser-res1").html('<li><div><h4>New year 2022 celebration started</h4><span>New year 2022, event booking, hotel booking and more</span><a href="listing-details.html"></a></div></li><li><div><h4>Home cleaning services near you</h4><span>Home cleaning, pet control and more</span><a href="service-experts/index.html"></a></div></li><li><div><h4>Software jobs waiting for you</h4><span>Jobs in New york, High pay salary</span><a href="jobs/job-details.html"></a></div></li><li><div><h4>Spa Center For Womens</h4><span>No:2, 4th Avenue, Newyork, USA, Near to Airport</span><a href="listing-details.html"></a></div></li><li><div><h4>Online classes for School Students</h4><span>Schools, university, colleges, online classes, tution centers, distance education..</span><a href="listing-details.html"></a></div></li><li><div><h4>Buy Iphone13 Pro now</h4><span>Iphone 13, 12, 11 and all apple product available</span><a href="listing-details.html"></a></div></li><li><div><h4>Now easy to buy Villas, Plots and Flats</h4><span>New york City</span><a href="listing-details.html"></a></div></li><li><div><h4>Best AC Service Expert near you</h4><span>Service expert, ac service, ac service in new york</span><a href="listing-details.html"></a></div></li>')

    $(".ban-short-links").addClass("ani");
    setTimeout(function () {
        $(".ani-quo").addClass("ani-quo-act")
    }, 7000);
    setTimeout(function () {
        $(".ani-quo").removeClass("ani-quo-act")
    }, 14000);
    setTimeout(function () {
        $(".btn-ser-need-ani").fadeIn();
    }, 15000);

    //TOP MENU OPEN AND CLOSE
    $('.menu').on('click', function () {
        //$('.pop-menu').fadeIn();
        $('.pop-menu').toggleClass("ani");
        $(this).toggleClass("ani");
    });
    $('.clopme').on('click', function () {
        $('.pop-menu').removeClass("ani");
        $('.menu').removeClass("ani");
    });
    ////DASHBOARD PROFILE OPEN AND CLOSE NEW
    $('.near-pro-cta').on('click', function () {
        $('.db-menu').addClass("act");
    });
    $('.db-menu-noti').on('click', function () {
        $('.top-noti-win').addClass("act");
    });
    $('.db-menu-clo').on('click', function () {
        $('.db-menu, .top-noti-win').removeClass("act");
    });    $('.ani-quo, .btn-ser-need-ani').on('click', function () {
        $('.ani-quo-form').addClass('ani-quo-form-act');
    });
    $('.ani-req-clo').on('click', function () {
        $('.ani-quo-form').removeClass('ani-quo-form-act');
    });
    // $('.qvv').on('click', function() {
    //     $('.list-qview').addClass('qview-show');
    // });
    // $('.list-qview').on('mouseleave', function() {
    //     $('.list-qview').removeClass('qview-show');
    // });
    $('.clo-list').on('click', function () {
        $('.list-qview').removeClass('qview-show');
    });
    $('.mob-me-ic').on('click', function () {
        $(this).toggleClass('act');
        $('.mob-me-all').toggleClass('mobmenu-show');
    });
    $('.mob-me-clo').on('click', function () {
        $('.mob-me-all').removeClass('mobmenu-show');
        $('.fqui-menu').removeClass('act');
    });
    $('.ll-1, .ll-2, .ll-3').on('click', function () {
        const index = $(this).attr('class').match(/ll-(\d)/)[1]; // Extract number from class (e.g., ll-1)
        $('.log-1, .log-2, .log-3').slideUp(); // Hide all
        $('.log-' + index).slideDown();       // Show only the matching one
    });
    $('.ll-4, .ll-5, .ll-6').on('click', function () {
        const index = $(this).attr('class').match(/ll-(\d)/)[1]; // Extract number from class (e.g., ll-1)
        $('.log-4, .log-5, .log-6').slideUp(); // Hide all
        $('.log-' + index).slideDown();       // Show only the matching one
    });

    //FILTER ON ALL LISTING PAGE - MOBILE VIEW ONLY
    $('.fil-mob').on('click', function () {
        $('.fil-mob-view').toggleClass("fil-mmob-act");
    });
    $('.fil-mob-clo').on('click', function () {
        $('.fil-mob-view').removeClass("fil-mmob-act");
    });
    
    //ALL LISTING GRID AND LIST VIEW CHANGE
    $('.vfilter i').on('click', function () {
        $('.vfilter i').removeClass('act')
        $(this).addClass('act')
    });
    $('.ic1').on('click', function () {
        $(".list-map").hide();
        $(".all-list-bre, .all-listing").show();
        $('.all-list-sh').removeClass('cview3');
        $('.all-list-sh').addClass('cview1');
    });
    $('.ic2').on('click', function () {
        $(".list-map").hide();
        $(".all-list-bre, .all-listing").show();
        $('.all-list-sh').removeClass('cview1');
        $('.all-list-sh').removeClass('cview3');
    });
    $('.ic3').on('click', function () {
        $(".all-list-bre, .all-listing").hide();
        $(".list-map").show();
    });
    //NOTIFICATION POPUP SHOW AND HIDE
    $('.btn-sure').on('click', function () {
        $('.noti-sure').addClass('cnoti-show');
        setTimeout(function () {
            $('.noti-sure').removeClass('cnoti-show');
        }, 5000);
    });
    setTimeout(function () {
        $('.status_message, .log-suc').fadeOut();
    }, 3000);
    $('.no').on('click', function () {
        $('.noti-sure').removeClass('cnoti-show');
    });
    //HOW TO TAB OPTIONS
    $('.how-to-coll li h4').on('click', function () {
        $('.how-to-coll li h4').removeClass('colact');
        $('.how-to-coll li div').slideUp();
        $(this).addClass('colact');
        $(this).next("div").slideDown();
    });
    //CREATE DUPLICATE LISTING
    $('.cre-dup-btn').on('click', function () {
        $('.cre-dup-form').slideDown();
    });
    //DASHBOARD PROFILE OPEN AND CLOSE OLD
    /*$('.al').on('mouseenter', function () {
     $('.db-menu').stop().slideDown();
     $('.ud').addClass('op1');
     });
     $('.al').on('mouseleave', function () {
     $('.db-menu').stop().slideUp();
     $('.ud').removeClass('op1');
     });*/
    $('.dropdown-menu li').on('click', function () {
        var getValue = $(this).text();
        $('.dropdown-select').text(getValue);
        //alert(getValue);
    });
    //USER PROFILE TAB
    $('.us-pro-nav ul li span').on('click', function () {
        $('.us-pro-nav ul li span').removeClass('act');
        $(this).addClass('act');
    });
    $('.us-pro-nav ul li:nth-child(1) span').on('click', function () {
        $('.us-ppg-com').slideDown();
    });
    $('.us-pro-nav ul li:nth-child(2) span').on('click', function () {
        $('.us-ppg-com').slideUp();
        $('.us-ppg-listings').slideDown();
    });
    $('.us-pro-nav ul li:nth-child(3) span').on('click', function () {
        $('.us-ppg-com').slideUp();
        $('.us-ppg-blog').slideDown();
    });
    $('.us-pro-nav ul li:nth-child(4) span').on('click', function () {
        $('.us-ppg-com').slideUp();
        $('.us-ppg-event').slideDown();
    });
    $('.us-pro-nav ul li:nth-child(5) span').on('click', function () {
        $('.us-ppg-com').slideUp();
        $('.us-ppg-follow').slideDown();
    });
    
    //SERVICES LIST ADD - APPEND
    $(".lis-ser-add-btn").on('click', function () {
        $(".add-list-ser ul li:last-child").after('<li><div class="row"> <div class="col-md-6"> <div class="form-group"> <label>Service name :</label>  <input type="text" name="service_id[]" class="form-control" placeholder="Ex: Plumbile"> </div> </div> <div class="col-md-6"> <div class="form-group"><div class="fil-img-uplo"> <span class="dumfil">Service Image</span> <input type="file" name="service_image[]" accept="image/*,.jpg,.jpeg,.png" class="form-control"> </div></div> </div> </div></li>');
    });
    //SERVICES OFFER LIST REMOVE - APPEND
    $(".lis-ser-rem-btn").on('click', function () {
        var _removListSer = $(".add-list-ser ul li").length;
        if (_removListSer >= 2) {
            $(".add-list-ser ul li:last-child").remove();
        } else {
            alert("Sorry! you are not allowed to remove the last one.");
        }
    });
    //SPECIAL OFFER LIST ADD - APPEND
    $(".lis-add-off").on('click', function () {
        $(".add-list-off ul li:last-child").after('<li><div class="row"> <div class="col-md-6"> <div class="form-group"> <input type="text" name="service_1_name[]" class="form-control" placeholder="Offer name *"> </div> </div> <div class="col-md-6"> <div class="form-group"> <input type="text" class="form-control" name="service_1_price[]" onkeypress="return isNumber(event)" placeholder="Price"> </div> </div> </div><div class="row"> <div class="col-md-12"> <div class="form-group"> <textarea class="form-control" name="service_1_detail[]" placeholder="Details about this offer"></textarea> </div> </div> </div><div class="row"> <div class="col-md-12"> <div class="form-group"><div class="fil-img-uplo"> <span class="dumfil">Choose offer image</span> <input type="file" name="service_1_image[]" accept="image/*,.jpg,.jpeg,.png" class="form-control"> </div></div> </div> </div><div class="row"> <div class="col-md-12"> <div class="form-group"> <input type="text" name="service_1_view_more[]" class="form-control" placeholder="View More Link"></div></div></div></li>');
    });
    //SPECIAL OFFER LIST REMOVE - APPEND
    $(".lis-add-rem").on('click', function () {
        var _removListOff = $(".add-list-off ul li").length;
        if (_removListOff >= 2) {
            $(".add-list-off ul li:last-child").remove();
        } else {
            alert("Sorry! you are not allowed to remove the last one.");
        }
    });
    //SPECIAL OFFER LIST ADD - APPEND
    $(".lis-add-oad").on('click', function () {
        $(".add-lis-oth ul li:last-child").after('<li> <div class="row"> <div class="col-md-5"> <div class="form-group"> <input type="text" name="listing_info_question[]" class="form-control" placeholder="Type your information"> </div> </div><div class="col-md-2"> <div class="form-group"> <i class="material-icons">arrow_forward</i> </div> </div> <div class="col-md-5"> <div class="form-group"> <input type="text" name="listing_info_answer[]" class="form-control" placeholder="yes"> </div> </div> </div> </li>');
    });
    //SPECIAL OFFER LIST REMOVE - APPEND
    $(".lis-add-ore").on('click', function () {
        var _removListOthe = $(".add-lis-oth ul li").length;
        if (_removListOthe >= 2) {
            $(".add-lis-oth ul li:last-child").remove();
        } else {
            alert("Sorry! you are not allowed to remove the last one.");
        }
    });
    //MOBILE MENU - DASHBOARD BOARD MENU SHOW
    $(".mv-pro").on('click', function () {
        $(".mv-pro-menu").slideToggle();
    });
    //BOOTSTRAP TOOL TIP
    $('[data-bs-toggle="tooltip"]').tooltip();

    //PRODUCT SPECIFICATION LIST ADD - APPEND
    $(".prod-add-oad").on('click', function () {
        $(".add-prod-oth ul li:last-child").after('<li> <div class="row"> <div class="col-md-5"> <div class="form-group"> <input type="text" name="product_info_question[]" class="form-control" placeholder="Type your information"> </div> </div><div class="col-md-2"> <div class="form-group"> <i class="material-icons">arrow_forward</i> </div> </div> <div class="col-md-5"> <div class="form-group"> <input type="text" name="product_info_answer[]" class="form-control" placeholder="yes"> </div> </div> </div> </li>');
    });
    //PRODUCT SPECIFICATION LIST REMOVE - APPEND
    $(".prod-add-ore").on('click', function () {
        var _removProSpe = $(".add-prod-oth ul li").length;
        if (_removProSpe >= 2) {
            $(".add-prod-oth ul li:last-child").remove();
        } else {
            alert("Sorry! you are not allowed to remove the last one.");
        }
    });

    //PRODUCT HIGHLIGHTS LIST ADD - APPEND
    $(".prod-add-high-oad").on('click', function () {
        $(".add-prod-high-oth ul li:last-child").after('<li> <div class="row"> <div class="col-md-12"> <div class="form-group"> <input type="text" name="product_highlights[]" class="form-control" placeholder="Type your highlights"> </div> </div> </div> </li>');
    });
    //PRODUCT HIGHLIGHTS LIST REMOVE - APPEND
    $(".prod-add-high-ore").on('click', function () {
        var _removProHig = $(".add-prod-high-oth ul li").length;
        if (_removProHig >= 2) {
            $(".add-prod-high-oth ul li:last-child").remove();
        } else {
            alert("Sorry! you are not allowed to remove the last one.");
        }
    });    //VIDEO LIST ADD - APPEND
    $(".lis-add-oadvideo").on('click', function () {
        $(".add-list-map ul li:last-child").after('<li> <div class="row"> <div class="col-md-12"> <div class="form-group"> <textarea id="listing_video" name="listing_video[]" class="form-control" placeholder="Paste Your Youtube Url here"></textarea> </div> </div> </div> </li>');
    });
    //VIDEO LIST REMOVE - APPEND
    $(".lis-add-orevideo").on('click', function () {
        var _removVid = $(".add-list-map ul li").length;
        if (_removVid >= 2) {
            $(".add-list-map ul li:last-child").remove();
        } else {
            alert("Sorry! you are not allowed to remove the last one.");
        }
    });

    //ENQUIRY AND REVIEW LIKE
    // $(".enq-sav i").click(function(){
    //   $(this).toggleClass('sav-act');
    // });

    //ENQUIRY AND REVIEW LIKE
    // $(".ldelik").click(function(){
    //   $(this).toggleClass('sav-act');
    // });

    //INPUT FOCUS TOOL TIP SHOW
    $(".form-group input, .form-group textarea").focus(function () {
        $(this).siblings(".inp-ttip").fadeIn();
    });
    $(".form-group input, .form-group textarea").blur(function () {
        $(this).siblings(".inp-ttip").fadeOut();
    });
    $(".form-group input, .form-group textarea").mouseleave(function () {
        $(this).siblings(".inp-ttip").fadeOut();
    });

    //IMAGE FILE UPLOAD GET FILE NAME
    $(".fil-img-uplo input").on("change", function () {
        var _upldfname = $(this).val().replace(/C:\\fakepath\\/i, '');
        $(this).siblings(".dumfil").html(_upldfname);
    });

    //MOBILE SEARCH SHOW
    $(".mob-sear").on('click', function () {
        $(".top-ser").toggleClass("top-ser-act");;
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

    //ADS TOTAL DAYS CALCULATION
    $("#start-date, #end-date").change(function () {
        var firstDate = $("#start-date").val();
        var secondDate = $("#end-date").val();
        var millisecondsPerDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
        var startDay = new Date(firstDate);
        var endDay = new Date(secondDate);
        var diffDays = Math.abs((startDay.getTime() - endDay.getTime()) / (millisecondsPerDay));
        $(".ad-tdays").text(diffDays);
        $("#ad_total_days").val(diffDays);
        // var adpocost = $('#adposi').find('option:selected', this).attr('mytag');
        var adpocost = $('#adposi').val();
        $(".ad-pocost").text(adpocost);
        $("#ad_cost_per_day").val(adpocost);
        var totcost = diffDays * adpocost;
        $(".ad-tcost").text(totcost);
        $("#ad_total_cost").val(totcost);
    });

    //Buy Point Cost CALCULATION Starts

    $('#new_points').on('input', function () {
        var new_points = $("#new_points").val();
        var cost_per_point = $("#cost_per_point").val();
        var cost_symbol = $("#cost_symbol").val();
        var totcost = new_points * cost_per_point;
        var button_msg = 'Click To Pay ' + cost_symbol + totcost;
        $("#buy_points_submit").text(button_msg);
        $("#all_cost").val(totcost);
    });

    //Buy Point Cost CALCULATION Ends

    //COPY RIGHTS YEAR
    $('#cry').text("2050");

    //PRE LOADING
    $('#status').fadeOut();
    $('#preloader').delay(350).fadeOut('slow');
    $('body').delay(350).css({
        'overflow': 'visible'
    });

    //BLOG POST SEARCH - BLOG DETAIL PAGE
    $("#pg-sear").on("keyup", function () {
        var value = $(this).val().toLowerCase();
        $("#pg-resu *").filter(function () {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
        });
    });

    //BIZBOOK EDITOR
    $(".bixedtr-tools").html("<div class='fore-wrapper'><i class='material-icons' style='color:#10a5ef;'>format_color_text</i> <div class='fore-palette'> </div> </div> <div class='back-wrapper'><i class='material-icons' style='background:#cbeeff;'>format_color_text</i> <div class='back-palette'> </div> </div> <a href='javascript:void(0)' data-command='bold'><i class='material-icons'>format_bold</i></a> <a href='javascript:void(0)' data-command='italic'><i class='material-icons'>format_italic</i></a> <a href='javascript:void(0)' data-command='underline'><i class='material-icons'>format_underlined</i></a> <a href='javascript:void(0)' data-command='justifyLeft'><i class='material-icons'>format_align_left</i></a> <a href='javascript:void(0)' data-command='justifyCenter'><i class='material-icons'>format_align_center</i></a> <a href='javascript:void(0)' data-command='justifyRight'><i class='material-icons'>format_align_right</i></a> <a href='javascript:void(0)' data-command='justifyFull'><i class='material-icons'>format_align_justify</i></a> <a href='javascript:void(0)' data-command='indent'><i class='material-icons'>format_indent_increase</i></a> <a href='javascript:void(0)' data-command='outdent'><i class='material-icons'>format_indent_decrease</i></a> <a href='javascript:void(0)' data-command='insertUnorderedList'><i class='material-icons'>format_list_bulleted</i></a> <a href='javascript:void(0)' data-command='insertOrderedList'><i class='material-icons'>format_list_numbered</i></a> <a href='javascript:void(0)' data-command='h2'>H2</a> <a href='javascript:void(0)' data-command='h4'>H4</a> <a href='javascript:void(0)' data-command='createlink'><i class='material-icons'>insert_link</i></a> <a href='javascript:void(0)' data-command='unlink'><i class='material-icons'>leak_remove</i></a><a href='javascript:void(0)' data-command='p'>P</a>");

    var colorPalette = ['000000', 'FF9966', '6699FF', '99FF66', 'CC0000', '00CC00', '0000CC', '333333', '0066FF', 'FFFFFF', '004fff'];
    var forePalette = $('.fore-palette');
    var backPalette = $('.back-palette');

    for (var i = 0; i < colorPalette.length; i++) {
        forePalette.append('<a href="#" data-command="forecolor" data-value="' + '#' + colorPalette[i] + '" style="background-color:' + '#' + colorPalette[i] + ';" class="palette-item"></a>');
        backPalette.append('<a href="#" data-command="backcolor" data-value="' + '#' + colorPalette[i] + '" style="background-color:' + '#' + colorPalette[i] + ';" class="palette-item"></a>');
    }

    $('.biz-toolbar a').click(function (e) {
        var command = $(this).data('command');
        if (command == 'h2' || command == 'h4' || command == 'p') {
            document.execCommand('formatBlock', false, command);
        }
        if (command == 'forecolor' || command == 'backcolor') {
            document.execCommand($(this).data('command'), false, $(this).data('value'));
        }
        if (command == 'createlink' || command == 'insertimage') {
            url = prompt('Enter the link here: ', 'http:\/\/');
            document.execCommand($(this).data('command'), false, url);
        } else document.execCommand($(this).data('command'), false, null);
    });
    //COMMON DATEPICKER
    $('.datepicker').each(function () {
        $(this).datepicker({
            minDate: 0
        });
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
$("#source").val(urlParam("source"));
if (urlParam("login") == "register") {
    $('.log-1, .log-3, .log-4, .log-6').slideUp();
    $('.log-2, .log-5').slideDown();
}
if (urlParam("login") == "forgot") {
    $('.log-1, .log-2').slideUp();
    $('.log-3').slideDown();
}
//CATEGORY FILTER ONLOAD ACTIVE
if (urlParam("features") == "trending") {
    $('.lhs-featu input:checkbox').removeAttr('checked');
    $('#trending').attr('checked', 'checked');
}

//SHARE URL
var _cururl = window.location.href;
$("#shareurl").val(_cururl);

function shareurl() {
    var copyText = document.getElementById("shareurl");
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(copyText.value);

    var tooltip = document.getElementById("myTooltip");
    tooltip.innerHTML = "Copied";
}

function shareurlout() {
    var tooltip = document.getElementById("myTooltip");
    tooltip.innerHTML = "Copy to clipboard";
}
//Auto complete For Blog Name ends Blog-Posts Page

//URL SOURCE TRACKING
// function getsource() {
//     var queryParams = {},
//         param;
//     var params = window.location.search.substring(1);
//     for (var i = 0; i < params.length; i++) {
//         param = params[i].split('=');
//         queryParams[param[0]] = param[1];
//     }
//    document.getElementById("source").value = params;
//     return params;
// }

//DOWNLOAD INVOICE
$('#downloadPDF').on('click', function () {
    // alert("viki");
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
//HOME PAGE SEARCH - INTERNAL PAGE SEARCH
$("#select-search").on("keyup", function () {
    var value = $(this).val().toLowerCase();
    $("#tser-res li").filter(function () {
        $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
    });
});

//HOME PAGE SEARCH - INTERNAL PAGE SEARCH
$("#top-select-search").on("keyup", function () {
    var value = $(this).val().toLowerCase();
    $("#tser-res1 li").filter(function () {
        $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
    });
});

//SEARCH JS
var htmlElement = document.getElementById("res");
//SEARCH EVENTS
$(".search-field").focus(function () {
    $(".tser-res1").addClass("act");
});
$(".search-field").on('click', function () {
    $(".tser-res1").addClass("act");
});
$(".ad-dash").on('click', function () {
    $(".tser-res1").removeClass("act");
});
$(".ban-search").mouseleave(function () {
    $(".tser-res1").removeClass("act");
});

$("#top-select-search").focus(function () {
    $(".tser-res2").addClass("act");
});
$("#top-select-search").on('click', function () {
    $(".tser-res2").addClass("act");
});
$(".hom-top").mouseleave(function () {
    $(".tser-res2").removeClass("act");
});if ($(".chosen-select").length > 0) {
    $(function () {
        $('.chosen-select').chosen();
    });
}