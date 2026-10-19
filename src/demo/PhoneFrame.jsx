// A CSS Android phone (360 x 760 screen) scaled to fit the viewport height.
export default function PhoneFrame({ scale = 1, children }) {
  return (
    <div className="phone-slot" style={{ width: 384 * scale, height: 784 * scale }}>
      <div className="phone" style={{ transform: `scale(${scale})` }}>
        <div className="phone-btn phone-btn-power" />
        <div className="phone-btn phone-btn-vol" />
        <div className="phone-screen">{children}</div>
        <div className="phone-punch" />
      </div>
    </div>
  );
}
