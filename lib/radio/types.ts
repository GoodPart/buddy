export type RadioStationQuery = {
  stn: string;
  ch?: string;
  city?: string;
};

export type RadioStation = RadioStationQuery & {
  id: string;
  name: string;
};
