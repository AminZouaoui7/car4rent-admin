import "./wave-background.css";

type WaveBackgroundProps = {
  children: React.ReactNode;
};

export default function WaveBackground({ children }: WaveBackgroundProps) {
  return (
    <div className="wave-bg">
      <div className="wave-bg__base" />
      <div className="wave-bg__radial wave-bg__radial--one" />
      <div className="wave-bg__radial wave-bg__radial--two" />
      <div className="wave-bg__radial wave-bg__radial--three" />

      <div className="wave-bg__rings">
        <span className="ring ring--1" />
        <span className="ring ring--2" />
        <span className="ring ring--3" />
        <span className="ring ring--4" />
      </div>

      <div className="wave-bg__light" />
      <div className="wave-bg__grid" />

      <div className="wave-bg__content">{children}</div>
    </div>
  );
}