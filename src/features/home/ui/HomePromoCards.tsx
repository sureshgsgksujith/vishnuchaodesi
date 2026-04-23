const promoCards = [
  {
    image: "/template-17/images/icon/1.png",
    title: "24 Million Business",
    description: "Choose from a collection of handpicked luxury villas & apartments",
    linkText: "Explore Now",
  },
  {
    image: "/template-17/images/icon/2.png",
    title: "500+ Service Experts",
    description: "Are you looking for the best Service Expert? We make it easy to hire the right professional",
    linkText: "Book Expert Now",
  },
  {
    image: "/template-17/images/icon/3.png",
    title: "Find Your Next Job Now",
    description: "Search latest job openings online including IT, Sales, Banking, Fresher, Walk-ins, Part-time & more",
    linkText: "Find you Job",
  },
  {
    image: "/template-17/images/icon/4.png",
    title: "Sell & Buy Product Online",
    description: "Bizbook Online store. Everything you need to sell & buy online.",
    linkText: "Start Selling Online",
  },
];

export default function HomePromoCards() {
  return (
    <div className="ban-ql">
      <div className="container">
        <div className="row">
          <ul>
            {promoCards.map((card) => (
              <li key={card.title}>
                <div>
                  <img src={card.image} alt={card.title} loading="lazy" />
                  <h4>{card.title}</h4>
                  <p>{card.description}</p>
                  <a href="#">{card.linkText}</a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}