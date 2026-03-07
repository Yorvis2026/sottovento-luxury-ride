"use client"

export function StickyBookButton() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 block md:hidden">
      <a
        href="#booking"
        style={{
          display: "block",
          width: "100%",
          backgroundColor: "#C8A96A",
          color: "#000",
          textAlign: "center",
          padding: "16px",
          fontWeight: 700,
          fontSize: "0.95rem",
          letterSpacing: "0.12em",
          textDecoration: "none",
        }}
      >
        BOOK NOW
      </a>
    </div>
  )
}
