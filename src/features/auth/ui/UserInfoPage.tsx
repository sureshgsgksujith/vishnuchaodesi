export default function UserInfoPage() {
  const name = localStorage.getItem("customer_name");
  const code = localStorage.getItem("customer_code");

  return (
    <div style={{ padding: 24 }}>
      <h1>User Information Page</h1>
      <p><b>Name:</b> {name}</p>
      <p><b>Customer Code:</b> {code}</p>
    </div>
  );
}