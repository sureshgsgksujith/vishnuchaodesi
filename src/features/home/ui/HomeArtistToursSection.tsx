import { useEffect } from "react";

const artistSlides = [
  [
    {
      image: "/template-17/images/chao-home-artists/2.jpg",
      name: "Zain Zohaib",
      date: "May 22",
      place: "NY",
    },
    {
      image: "/template-17/images/chao-home-artists/4.jpg",
      name: "Asim Azhar",
      date: "Apr 25",
      place: "NY",
    },
  ],
  [
    {
      image: "/template-17/images/chao-home-artists/1.jpeg",
      name: "Dj Browny",
      date: "Apr 17 - Jun 07",
      place: "AZ, DC, IL",
    },
    {
      image: "/template-17/images/chao-home-artists/4.jpg",
      name: "Anuv Jain",
      date: "May 01 - May 11",
      place: "CA, GA",
    },
  ],
  [
    {
      image: "/template-17/images/chao-home-artists/2.jpg",
      name: "Zain Zohaib",
      date: "May 22",
      place: "NY",
    },
    {
      image: "/template-17/images/chao-home-artists/3.jpg",
      name: "Asim Azhar",
      date: "Apr 25",
      place: "NY",
    },
  ],
  [
    {
      image: "/template-17/images/chao-home-artists/1.jpeg",
      name: "Dj Browny",
      date: "Apr 17 - Jun 07",
      place: "AZ, DC, IL",
    },
    {
      image: "/template-17/images/chao-home-artists/4.jpg",
      name: "Anuv Jain",
      date: "May 01 - May 11",
      place: "CA, GA",
    },
  ],
];

export default function HomeArtistToursSection() {
  useEffect(() => {
    let tries = 0;

    const initSlider = () => {
      const $ = (window as any).$ || (window as any).jQuery;

      if ($ && $.fn && $.fn.slick) {
        const slider = $(".artist-sliser-auto");

        if (slider.length === 0) return;

        if (slider.hasClass("slick-initialized")) {
          slider.slick("unslick");
        }

        slider.slick({
          slidesToShow: 3,
          slidesToScroll: 1,
          autoplay: true,
          autoplaySpeed: 2500,
          arrows: true,
          dots: false,
          infinite: true,
          responsive: [
            {
              breakpoint: 1200,
              settings: {
                slidesToShow: 3,
              },
            },
            {
              breakpoint: 992,
              settings: {
                slidesToShow: 2,
              },
            },
            {
              breakpoint: 768,
              settings: {
                slidesToShow: 1,
              },
            },
          ],
        });

        return;
      }

      tries += 1;
      if (tries < 20) {
        setTimeout(initSlider, 300);
      }
    };

    initSlider();
  }, []);

  return (
    <section className="home-artist">
      <div className="plac-hom-bd plac-deta-sec plac-deta-sec-com">
        <div className="container">
          <div className="row">
            <div className="plac-det-tit-inn text-center">
              <h2>
                <span>Trending Artist Tours 2026</span>
              </h2>
            </div>

            <div className="plac-hom-all-pla">
              <ul className="artist-sliser-auto">
                {artistSlides.map((group, index) => (
                  <li key={index}>
                    <div className="artist-slide-group">
                      {group.map((artist) => (
                        <div className="service-card" key={artist.name + artist.date + artist.image}>
                          <div className="service-left">
                            <img src={artist.image} alt={artist.name} />
                          </div>
                          <div className="service-content">
                            <h4>{artist.name}</h4>
                            <p>Tour Date: {artist.date}</p>
                            <small>Tour at: {artist.place}</small>
                          </div>
                          <div className="service-arrow">
                            <i className="material-icons">chevron_right</i>
                          </div>
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}