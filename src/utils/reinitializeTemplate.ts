declare global {
  interface Window {
    $?: any;
    jQuery?: any;
  }
}

export function reinitializeTemplate() {
  setTimeout(() => {
    if (!window.$) return;

    try {
      window.$(window).trigger("load");

      if (window.$(".artist-sliser-auto").length) {
        if (window.$(".artist-sliser-auto").hasClass("slick-initialized")) {
          window.$(".artist-sliser-auto").slick("unslick");
        }

        window.$(".artist-sliser-auto").slick({
          infinite: true,
          slidesToShow: 3,
          slidesToScroll: 1,
          autoplay: true,
          autoplaySpeed: 3000,
          responsive: [
            {
              breakpoint: 992,
              settings: {
                slidesToShow: 1,
                slidesToScroll: 1,
                centerMode: false,
              },
            },
          ],
        });
      }

      if (window.$(".travel-sliser").length) {
        if (window.$(".travel-sliser").hasClass("slick-initialized")) {
          window.$(".travel-sliser").slick("unslick");
        }

        window.$(".travel-sliser").slick({
          infinite: true,
          slidesToShow: 3,
          slidesToScroll: 1,
          autoplay: false,
          responsive: [
            {
              breakpoint: 992,
              settings: {
                slidesToShow: 1,
                slidesToScroll: 1,
                centerMode: false,
              },
            },
          ],
        });
      }

      if (window.$(".caregiver-slider").length) {
        if (window.$(".caregiver-slider").hasClass("slick-initialized")) {
          window.$(".caregiver-slider").slick("unslick");
        }

        window.$(".caregiver-slider").slick({
          slidesToShow: 3,
          slidesToScroll: 1,
          infinite: true,
          arrows: true,
          dots: false,
          autoplay: false,
          responsive: [
            {
              breakpoint: 1024,
              settings: { slidesToShow: 2 },
            },
            {
              breakpoint: 768,
              settings: { slidesToShow: 1 },
            },
          ],
        });
      }
    } catch (error) {
      console.error("Template reinitialize error:", error);
    }
  }, 150);
}