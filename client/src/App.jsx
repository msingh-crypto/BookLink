import Navbar from "./components/Navbar";
import Register from "./components/Register";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="container mx-auto px-4">
        <Register />
      </main>
    </div>
  );
}
