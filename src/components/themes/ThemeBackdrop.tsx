import React from 'react';
import { ThemeId } from '../../types/theme';
import { DesertOasisDecorations } from '../DesertOasisDecorations';
import { AtlantisDecorations } from './AtlantisDecorations';
import { TundraDecorations } from './TundraDecorations';
import { GalaxyDecorations } from './GalaxyDecorations';
import { JungleDecorations } from './JungleDecorations';
import { JavaMountainsDecorations } from './JavaMountainsDecorations';

interface ThemeBackdropProps {
  themeId: ThemeId;
}

export const ThemeBackdrop: React.FC<ThemeBackdropProps> = ({ themeId }) => {
  switch (themeId) {
    case 'atlantis':
      return <AtlantisDecorations />;
    case 'tundra':
      return <TundraDecorations />;
    case 'galaxy':
      return <GalaxyDecorations />;
    case 'jungle':
      return <JungleDecorations />;
    case 'mountains':
      return <JavaMountainsDecorations />;
    case 'desert':
    default:
      return <DesertOasisDecorations />;
  }
};
