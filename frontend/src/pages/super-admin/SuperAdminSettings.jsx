import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import axios from 'axios';
import NavBar from "../../components/navigation/NavBar";

export default function SuperAdminDashboard() {
  return (
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">
      <NavBar />

      <main className="overflow-y-auto p-6 animate-[fadeIn_0.4s_ease-out_forwards]">
        <section className="superadmin-banner">
          <div>
            <h1 className="text-[white]! text-[28px]! font-bold mb-2 tracking-[-0.5px]">Settings</h1>
            <p className="text-[white]! opacity-80 text-[15px]! m-0">Here you can configure things.</p>
          </div>
        </section>

      </main>

    </div>
  );
}