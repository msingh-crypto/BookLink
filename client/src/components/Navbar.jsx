import React from "react";

export default function Navbar() {
  return (
    <nav className="bg-slate-900 text-white p-4 shadow-md">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-xl font-bold tracking-tight">BookLink</h1>
        <ul className="flex gap-6 text-sm font-medium">
          <li>
            <a href="#home" className="hover:text-blue-400 transition">
              Home
            </a>
          </li>
          <li>
            <a href="#books" className="hover:text-blue-400 transition">
              Books
            </a>
          </li>
          <li>
            <a href="#api-docs" className="hover:text-blue-400 transition">
              API Docs
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
