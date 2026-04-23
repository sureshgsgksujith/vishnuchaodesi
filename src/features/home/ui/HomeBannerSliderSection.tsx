export default function HomeBannerSliderSection() {
  return (
    <section>
      <div id="demo" className="carousel slide cate-sli caro-home" data-bs-ride="carousel">
        <div className="container">
          <div className="row">
            <div className="inn">
              <div className="carousel-inner">
                <div className="carousel-item active">
                  <img
                    src="/template-17/images/slider/90890557952.jpg"
                    alt="Los Angeles"
                    width="1100"
                    height="500"
                  />
                  <a href="#" target="_blank" rel="noreferrer"></a>
                </div>

                <div className="carousel-item">
                  <img
                    src="/template-17/images/slider/27459517111.jpg"
                    alt="Los Angeles"
                    width="1100"
                    height="500"
                  />
                  <a href="#" target="_blank" rel="noreferrer"></a>
                </div>
              </div>

              <a className="carousel-control-prev" href="#demo" data-bs-slide="prev">
                <span className="carousel-control-prev-icon"></span>
              </a>

              <a className="carousel-control-next" href="#demo" data-bs-slide="next">
                <span className="carousel-control-next-icon"></span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}