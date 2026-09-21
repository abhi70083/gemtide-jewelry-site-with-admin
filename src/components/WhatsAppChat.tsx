import React from 'react';

const WhatsAppChat: React.FC = () => {
    const phoneNumber = '917083103399';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent("Hello! I'm interested in GemTide jewelry and would like to ask a question.")}`;

    return (
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-white/90 backdrop-blur-xl border border-slate-200 px-5 py-3 rounded-full shadow-md hover:border-brand-green/40 hover:-translate-y-0.5 transition-all duration-300 group"
            aria-label="Chat on WhatsApp"
        >
            <span className="text-[9px] font-tech font-bold uppercase tracking-[0.25em] text-slate-800 group-hover:text-brand-green transition-colors duration-300">
                WhatsApp Support
            </span>
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green/70 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-green"></span>
            </span>
        </a>
    );
};

export default WhatsAppChat;
