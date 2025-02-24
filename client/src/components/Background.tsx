import React from "react";
export const BackgroundStars = () => {
  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden">
      {/* Unified background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(26,31,53,0)] to-[rgba(37,42,68,0)]" />
      {/* Star layers */}
      <div className="absolute inset-0">
        <div className="stars-small" />
        <div className="stars-medium" />
        <div className="stars-large" />
        <div className="twinkling" />
      </div>
      {/* More shooting stars */}
      <div className="shooting-stars">
        <div className="shooting-star" />
        <div className="shooting-star-2" />
        <div className="shooting-star-3" />
        <div className="shooting-star-4" />
        <div className="shooting-star-5" />
        <div className="shooting-star-6" />
        <div className="shooting-star-7" />
        <div className="shooting-star-8" />
        <div className="shooting-star-9" />
        <div className="shooting-star-10" />
        <div className="shooting-star-11" />
        <div className="shooting-star-12" />
        <div className="shooting-star-13" />
        <div className="shooting-star-14" />
        <div className="shooting-star-15" />
      </div>
      <style jsx>{`
        .stars-small,
        .stars-medium,
        .stars-large {
          position: absolute;
          inset: 0;
          background-repeat: repeat;
        }
        .stars-small {
          background-image: ${generateStarField(150, 1)};
          background-size: 500px 500px;
          opacity: 0.8;
        }
        .stars-medium {
          background-image: ${generateStarField(75, 1.5)};
          background-size: 700px 700px;
          opacity: 0.7;
        }
        .stars-large {
          background-image: ${generateStarField(40, 2)};
          background-size: 900px 900px;
          opacity: 0.6;
        }
        .twinkling {
          position: absolute;
          inset: 0;
          background-image: ${generateStarField(20, 2)};
          background-size: 700px 700px;
          animation: twinkle 4s ease-in-out infinite;
        }
        .shooting-stars {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }
        .shooting-star,
        .shooting-star-2,
        .shooting-star-3,
        .shooting-star-4,
        .shooting-star-5,
        .shooting-star-6,
        .shooting-star-7,
        .shooting-star-8,
        .shooting-star-9,
        .shooting-star-10,
        .shooting-star-11,
        .shooting-star-12,
        .shooting-star-13,
        .shooting-star-14,
        .shooting-star-15 {
          position: absolute;
          height: 1px;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.2) 50%,
            rgba(255, 255, 255, 0.8) 80%,
            rgba(255, 255, 255, 1) 100%
          );
          opacity: 0;
          transform-origin: left center;
        }
        .shooting-star {
          top: 20%;
          left: 30%;
          width: 80px;
          filter: drop-shadow(0 0 2px #fff);
          animation: shoot1 4s linear infinite;
        }
        .shooting-star-2 {
          top: 10%;
          left: 40%;
          width: 60px;
          filter: drop-shadow(0 0 1px #fff);
          animation: shoot2 6s linear infinite;
          animation-delay: 1s;
        }
        .shooting-star-3 {
          top: 30%;
          left: 20%;
          width: 70px;
          filter: drop-shadow(0 0 2px #fff);
          animation: shoot3 5s linear infinite;
          animation-delay: 2.5s;
        }
        .shooting-star-4 {
          top: 25%;
          left: 55%;
          width: 65px;
          filter: drop-shadow(0 0 1.5px #fff);
          animation: shoot4 7s linear infinite;
          animation-delay: 3.5s;
        }
        .shooting-star-5 {
          top: 15%;
          left: 45%;
          width: 75px;
          filter: drop-shadow(0 0 2px #fff);
          animation: shoot5 5.5s linear infinite;
          animation-delay: 4.5s;
        }
        .shooting-star-6 {
          top: 35%;
          left: 25%;
          width: 70px;
          animation: shoot1 5.5s linear infinite;
          animation-delay: 0.5s;
        }
        .shooting-star-7 {
          top: 15%;
          left: 60%;
          width: 65px;
          animation: shoot2 6.5s linear infinite;
          animation-delay: 1.5s;
        }
        .shooting-star-8 {
          top: 40%;
          left: 35%;
          width: 75px;
          animation: shoot3 4.8s linear infinite;
          animation-delay: 2.8s;
        }
        .shooting-star-9 {
          top: 22%;
          left: 48%;
          width: 68px;
          animation: shoot4 5.2s linear infinite;
          animation-delay: 3.2s;
        }
        .shooting-star-10 {
          top: 28%;
          left: 15%;
          width: 72px;
          animation: shoot5 6.2s linear infinite;
          animation-delay: 4.2s;
        }
        .shooting-star-11 {
          top: 18%;
          left: 52%;
          width: 63px;
          animation: shoot1 5.8s linear infinite;
          animation-delay: 1.8s;
        }
        .shooting-star-12 {
          top: 32%;
          left: 42%;
          width: 77px;
          animation: shoot2 4.5s linear infinite;
          animation-delay: 2.5s;
        }
        .shooting-star-13 {
          top: 25%;
          left: 28%;
          width: 69px;
          animation: shoot3 6.8s linear infinite;
          animation-delay: 3.8s;
        }
        .shooting-star-14 {
          top: 12%;
          left: 35%;
          width: 71px;
          animation: shoot4 5.5s linear infinite;
          animation-delay: 4.5s;
        }
        .shooting-star-15 {
          top: 38%;
          left: 58%;
          width: 66px;
          animation: shoot5 4.2s linear infinite;
          animation-delay: 0.8s;
        }
        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.2;
          }
          50% {
            opacity: 1;
          }
        }
        @keyframes moonOuterPulse {
          0%,
          100% {
            transform: scale(1.8);
            opacity: 0.2;
          }
          50% {
            transform: scale(2.2);
            opacity: 0.3;
          }
        }
        @keyframes moonPulse {
          0%,
          100% {
            transform: scale(1.5);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.8);
            opacity: 0.5;
          }
        }
        @keyframes shoot1 {
          0% {
            transform: translate(0, 0) rotate(35deg);
            opacity: 0;
          }
          2% {
            opacity: 1;
          }
          6% {
            transform: translate(400px, 280px) rotate(35deg);
            opacity: 0;
          }
          100% {
            transform: translate(400px, 280px) rotate(35deg);
            opacity: 0;
          }
        }
        @keyframes shoot2 {
          0% {
            transform: translate(0, 0) rotate(45deg);
            opacity: 0;
          }
          2% {
            opacity: 1;
          }
          6% {
            transform: translate(300px, 300px) rotate(45deg);
            opacity: 0;
          }
          100% {
            transform: translate(300px, 300px) rotate(45deg);
            opacity: 0;
          }
        }
        @keyframes shoot3 {
          0% {
            transform: translate(0, 0) rotate(40deg);
            opacity: 0;
          }
          2% {
            opacity: 1;
          }
          6% {
            transform: translate(350px, 290px) rotate(40deg);
            opacity: 0;
          }
          100% {
            transform: translate(350px, 290px) rotate(40deg);
            opacity: 0;
          }
        }
        @keyframes shoot4 {
          0% {
            transform: translate(0, 0) rotate(30deg);
            opacity: 0;
          }
          2% {
            opacity: 1;
          }
          6% {
            transform: translate(380px, 220px) rotate(30deg);
            opacity: 0;
          }
          100% {
            transform: translate(380px, 220px) rotate(30deg);
            opacity: 0;
          }
        }
        @keyframes shoot5 {
          0% {
            transform: translate(0, 0) rotate(50deg);
            opacity: 0;
          }
          2% {
            opacity: 1;
          }
          6% {
            transform: translate(320px, 380px) rotate(50deg);
            opacity: 0;
          }
          100% {
            transform: translate(320px, 380px) rotate(50deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
function generateStarField(count: number, size: number) {
  const stars = Array.from(
    {
      length: count,
    },
    () => {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const brightness = Math.random() * 0.5 + 0.5;
      return `radial-gradient(${size}px ${size}px at ${x}% ${y}%, rgba(255,255,255,${brightness}), transparent)`;
    },
  );
  return stars.join(",");
}
