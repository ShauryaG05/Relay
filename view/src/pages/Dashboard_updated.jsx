import React from "react";

function Dash() {
  async function lock_device() {
    // Stub
  }
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 flex flex-col items-center justify-center gap-4">
      <button
        onClick={lock_device}
        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium transition-colors"
      >
        Lock device
      </button>
    </div>
  );
}

export default Dash;
