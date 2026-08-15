export default function TeamSection() {
  const teamMembers = [
    { name: "مجید اکبری", role: "لیدر و معمار سیستم", img: "/majid.jpg" },
    { name: "امیرمحمد رهنما", role: "مهندسی صنایع صنعتی اصفهان", img: "/amir.jpg" },
    { name: "مهدی بارانی", role: "مهندسی ایمنی صنعتی بندرعباس", img: "/mahdi.jpg" },
    { name: "اباالفضل شاهی", role: "مهندسی مکانیک رجایی تهران", img: "/abolfazl.jpg"},
    { name: "محمد\u200cعلی باقرزاده", role: "مهندسی مکانیک یزد", img: "/M.Ali.jpg" }

  ];

  return (
    <section className="team">
      <div className="container">
        <div className="team-header">
          <h2>هسته اصلی توسعه سفینه</h2>
          <p style={{ marginTop: '10px' }}>تیم پر تلاش و با انگیزه توسعه‌دهندگان پلتفرم سفینه</p>
        </div>

        <div className="team-grid">
          {teamMembers.map((m, idx) => (
            <div key={idx} className="team-card">
              <div className="member-photo">
                <img src={m.img} alt={m.name} />
              </div>
              <h3>{m.name}</h3>
              <span className="team-role">{m.role}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
