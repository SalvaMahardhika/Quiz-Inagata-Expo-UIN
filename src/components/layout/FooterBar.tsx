import React from 'react';
import { ThemeConfig } from '../../types/theme';

interface FooterBarProps {
  theme: ThemeConfig;
}

export const FooterBar: React.FC<FooterBarProps> = ({ theme }) => {
  return (
    <footer
      className={`relative z-20 w-full px-4 py-2 border-t ${theme.footerBorder} ${theme.footerBg} text-center shrink-0 transition-colors duration-300 select-none`}
    >
      <p className={`text-xs font-semibold ${theme.footerText}`}>
        Quiz Inagata · Tema {theme.name}
      </p>
    </footer>
  );
};
