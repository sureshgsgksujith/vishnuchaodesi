export default function HomeTechnologySection() {
  return (
    <section className="chao-tech">
      <div className="container">
        <div className="tech-title text-center">
          <h2>Technology Training &amp; Placement</h2>
          <p className="subtitle">From Learning to Earning your path to IT Excellence</p>
          <p className="desc">
            Transform your career with professional IT training programs designed to help you grow faster.
          </p>
        </div>

        <div className="tech-box">
          <h4>Level Up Your Skills with Expert-Led Courses</h4>
          <ul>
            <li>Wide range of technology training programs</li>
            <li>Learn new skills with expert trainers</li>
            <li>Personalized career guidance and support</li>
          </ul>

          <div className="tech-buttons">
            <a href="#" className="btn-outline">+1-732-338-7323</a>
            <a href="#" className="btn-outline">+1-512-444-8397</a>
          </div>
        </div>

        <div className="row tech-content">
          <div className="col-md-5">
            <div className="tech-image">
              <img src="/template-17/images/home/student.jpg" alt="IT Training" />
            </div>
          </div>

          <div className="col-md-7">
            <div className="tech-info">
              <h4>Explore in-demand technology courses</h4>
              <p>Boost your career with trending IT skills and job-ready programs.</p>

              <div className="tech-list">
                <ul>
                  <li>Cloud Computing</li>
                  <li>Robotic Process Automation</li>
                  <li>DevOps</li>
                </ul>
                <ul>
                  <li>Blockchain</li>
                  <li>Big Data</li>
                  <li>Artificial Intelligence</li>
                </ul>
              </div>

              <a href="#" className="btn-primary">Explore Courses</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}