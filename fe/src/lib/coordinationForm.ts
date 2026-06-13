export const COORDINATION_TITLE_MAX_LENGTH = 40;
export const COORDINATION_DESCRIPTION_MAX_LENGTH = 300;
export const COORDINATION_DESCRIPTION_PREVIEW_LENGTH = 90;

export const trimCoordinationDescription = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};
