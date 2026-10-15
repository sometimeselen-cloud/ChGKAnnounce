
const API_BASE = "https://api.rating.chgk.info";

export interface Editor {
  id?: number;
  name?: string;
  patronymic?: string;
  surname?: string;
}

export interface Tournament {
  id: number;
  name: string;
  editors?: Editor[];
  difficultyForecast?: number | null;
}

export function extractTournamentId(
  input: string,
): number | null {
  try {
    const url = new URL(input.trim());

    if (
      !["rating.chgk.info", "www.rating.chgk.info"]
        .includes(url.hostname)
    ) {
      return null;
    }

    const match = url.pathname.match(
      /^\/tournaments?\/(\d+)\/?$/,
    );

    if (!match) return null;

    const id = Number(match[1]);

    return Number.isSafeInteger(id) && id > 0
      ? id
      : null;
  } catch {
    return null;
  }
}

export async function getTournament(
  id: number,
  token: string,
): Promise<Tournament> {
  const response = await fetch(
    `${API_BASE}/tournaments/${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Rating API returned HTTP ${response.status}`,
    );
  }

  const data: unknown = await response.json();

  if (
    typeof data !== "object" ||
    data === null ||
    !("id" in data) ||
    !("name" in data) ||
    typeof data.id !== "number" ||
    typeof data.name !== "string"
  ) {
    throw new Error("Unexpected tournament API response");
  }

  return data as Tournament;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });
}

export function formatTournament(
  tournament: Tournament,
): string {
  const editors = (tournament.editors ?? [])
    .map((editor) =>
      [
        editor.surname,
        editor.name,
        editor.patronymic,
      ]
        .filter(
          (part): part is string =>
            typeof part === "string" &&
            part.trim().length > 0,
        )
        .map((part) => part.trim())
        .join(" "),
    )
    .filter(Boolean);

  const difficulty =
    typeof tournament.difficultyForecast === "number"
      ? String(tournament.difficultyForecast)
      : "не указана";

  return [
    `🏆 <b>${escapeHtml(tournament.name)}</b>`,
    "",
    `✍️ <b>Редакторы:</b> ${
      editors.length
        ? editors.map(escapeHtml).join(", ")
        : "не указаны"
    }`,
    `📊 <b>Заявленная сложность:</b> ${escapeHtml(difficulty)}`,
    "",
    `<a href="https://rating.chgk.info/tournament/${tournament.id}">Страница турнира</a>`,
  ].join("\n");
}
