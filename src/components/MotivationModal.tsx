import React, { useState, useEffect, useRef } from 'react';

const motivatingNotes = [
  "Goodluck sa task love, I love you!",
  "Drink water and take breaks, I love you!",
  "You got this love, I love you!",
  "hehe labyu"
];

const MotivationModal = () => {
  const [isOpen, setIsOpen] = useState(true);
  const modalRef = useRef(null);

  const getRandomMotivation = () => {
    const randomIndex = Math.floor(Math.random() * motivatingNotes.length);
    return motivatingNotes[randomIndex];
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [modalRef]);

  if (!isOpen) return null;

  return (
    <div
      id="motivation-card"
      className="absolute left-0 top-0 flex items-center justify-center h-full w-full z-50 bg-black bg-opacity-50 backdrop-blur-sm"
    >
      <div ref={modalRef} className="relative w-full max-w-md p-6 rounded-none md:rounded-lg shadow-lg overflow-hidden">
        {/* Animated background layer */}
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-pattern bg-[length:30px_30px] animate-bg-move z-0" />

        {/* Content layer */}
        <div className="relative z-10 text-center text-white">
          <h1 className="text-lg font-semibold">{getRandomMotivation()}</h1>
          <div className='flex justify-center items-center'>
            <div className='m-auto'></div>
            <h1 className='m-auto'>-zo</h1>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MotivationModal;
