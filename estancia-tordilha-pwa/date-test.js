import { format, addDays, parseISO, isSameDay } from 'date-fns';

const selectedDay = "2026-03-06";
const selectedDayParsed = parseISO(selectedDay);
const data_hora = "2026-03-06T08:00:00+00:00";
const dataHoraParsed = parseISO(data_hora);

console.log("selectedDay:", selectedDay);
console.log("selectedDayParsed:", selectedDayParsed);
console.log("data_hora:", data_hora);
console.log("dataHoraParsed:", dataHoraParsed);
console.log("isSameDay:", isSameDay(dataHoraParsed, selectedDayParsed));
