import { z } from "zod";

const dutchPostcode = z.string().regex(/^\d{4}\s?[A-Za-z]{2}$/, "Vul een geldige postcode in (1234 AB)");

const notPastDate = z.string().refine((val) => {
  if (!val) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const input = new Date(val + "T00:00:00");
  return input >= today;
}, "De datum mag niet in het verleden liggen");

export const eventDateSchema = z.object({
  date: notPastDate,
  start_time: z.string().min(1, "Vul een starttijd in"),
  end_time: z.string().min(1, "Vul een eindtijd in"),
}).refine((data) => data.end_time > data.start_time, {
  message: "Eindtijd moet na starttijd liggen",
  path: ["end_time"],
});

export const eventLocationSchema = z.object({
  address: z.string().min(2, "Vul een adres in"),
  postal_code: dutchPostcode,
  city: z.string().min(2, "Vul een plaats in"),
}).refine((data) => data.address.length > 0, { message: "Adres verplicht", path: ["address"] });

export const eventGuestsSchema = z.object({
  num_children: z.number().int().min(0, "Aantal kinderen mag niet negatief zijn"),
  num_adults: z.number().int().min(0, "Aantal volwassenen mag niet negatief zijn"),
});

export const themeSchema = z.object({
  theme: z.string().optional(),
  custom_theme: z.string().optional(),
  design_by_mococha: z.boolean(),
}).refine((data) => data.theme || data.custom_theme || data.design_by_mococha, "Kies een thema, vul een eigen thema in, of kies 'Laat MOCOCHA ontwerpen'");

export type EventDateData = z.infer<typeof eventDateSchema>;
export type EventLocationData = z.infer<typeof eventLocationSchema>;
export type EventGuestsData = z.infer<typeof eventGuestsSchema>;
export type ThemeData = z.infer<typeof themeSchema>;
