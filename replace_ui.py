import sys

with open('src/pages/Events/EventScanner.tsx', 'r') as f:
    content = f.read()

# Replace everything from `<div className="flex-1 relative flex items-center justify-center">` to `{/* Status Overlays */}`
start_marker = "      <div className=\"flex-1 relative flex items-center justify-center\">\n"
end_marker = "        {/* Status Overlays */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers")
    sys.exit(1)

new_ui = """      <div className="flex-1 relative w-full h-full">
        {scanError ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center p-4">
            <div className="p-8 text-center space-y-4 max-w-sm w-full bg-white/10 backdrop-blur-md rounded-3xl border border-white/20">
              <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-white font-medium">{scanError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-2.5 bg-white text-black font-semibold rounded-xl w-full hover:bg-gray-100 transition-colors active:scale-95"
              >
                Refresh Page
              </button>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full">
            <div id="gate-reader" ref={renderRef} className="absolute inset-0 w-full h-full bg-black" />
            <style>{`
              #gate-reader video { object-fit: cover !important; width: 100% !important; height: 100% !important; ${cameraFacingMode === 'user' ? 'transform: scaleX(-1);' : ''} }
              #gate-reader canvas, #gate-reader img, #gate-reader svg { display: none !important; }
              #gate-reader div { box-shadow: none !important; border: none !important; }
            `}</style>

            {/* Adjust darkness: Reduced shadow alpha for clearer view */}
            <div className="absolute inset-0 bg-black/40 z-10 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] rounded-3xl" />
            </div>

            {/* Custom Green Corner Frames Only */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] z-20 pointer-events-none">
              <div className="absolute inset-0 overflow-hidden rounded-3xl">
                  <motion.div
                  initial={{ top: "-10%" }}
                  animate={{ top: "110%" }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="absolute left-0 right-0 h-0.5 bg-brand-500 shadow-[0_0_20px_rgba(34,197,94,0.8)]"
                  >
                  <div className="absolute inset-x-0 -top-12 h-12 bg-gradient-to-t from-brand-500/30 to-transparent" />
                  </motion.div>
              </div>
              {/* Custom Corners */}
              <div className="absolute top-0 left-0 w-16 h-16 border-l-4 border-t-4 border-brand-500 rounded-tl-3xl" />
              <div className="absolute top-0 right-0 w-16 h-16 border-r-4 border-t-4 border-brand-500 rounded-tr-3xl" />
              <div className="absolute bottom-0 left-0 w-16 h-16 border-l-4 border-b-4 border-brand-500 rounded-bl-3xl" />
              <div className="absolute bottom-0 right-0 w-16 h-16 border-r-4 border-b-4 border-brand-500 rounded-br-3xl" />
            </div>

            {/* Controls Container */}
            <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="absolute bottom-8 inset-x-0 w-full flex justify-center items-center z-50 pointer-events-auto"
            >
                <button
                    onClick={() => setCameraFacingMode(prev => prev === "user" ? "environment" : "user")}
                    className="p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md border border-white/20 active:scale-95 shadow-xl"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-7 h-7">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                </button>
            </motion.div>
          </div>
        )}

"""

new_content = content[:start_idx] + new_ui + content[end_idx:]

with open('src/pages/Events/EventScanner.tsx', 'w') as f:
    f.write(new_content)

print("Updated UI")
