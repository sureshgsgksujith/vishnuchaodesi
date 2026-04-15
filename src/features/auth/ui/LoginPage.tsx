import { Link } from "react-router-dom";

export default function LoginPage() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>ChaoDesi Customer</h1>
        <p>React + Vite customer project setup completed.</p>
        <Link to="/home" style={styles.link}>
          Go to Home
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f7fb",
  },
  card: {
    width: 420,
    background: "#ffffff",
    padding: 32,
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  link: {
    display: "inline-block",
    marginTop: 16,
    textDecoration: "none",
    color: "#1976d2",
    fontWeight: 600,
  },
};