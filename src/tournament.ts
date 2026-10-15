
const API_BASE = "https://api.rating.chgk.info";

export interface Tournament {
  id: number;
  name: string;
  editors?: Array<{
    name?: string;
    patronymic?: string;
    surname?: string;
  }>;
  difficultyForecast?: number | null;
}

export function extractTournamentId(input: string): number | null {
  try {
    const url = new URL(input.trim());

    if (
      !["rating.chgk.info", "www.rating.chgk.info"].includes(
        url.hostname
      )
    ) {
      return null;
    }

    const match = url.pathname.match(
      /\/tournaments?\/(\d+)\/?/
    );

    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

export async function getTournament(
  id: number,
  token: string
): Promise<Tournament> {
  const response = await fetch(
    `${API_BASE}/tournaments/${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!response.ok) {
    throw new Error(`CHGK API error: ${response.status}`);
  }

  return (await response.json()) as Tournament;
}

export function formatTournament(
  tournament: Tournament
): string {
  const editors = (tournament.editors ?? [])
    .map((editor) =>
      [
        editor.surname,
        editor.name,
        editor.patronymic,
      ]
        .filter(Boolean)
        .join(" ")
    )
    .filter(Boolean);

  const lines = [
    `🏆 <b>${escapeHtml(tournament.name)}</b>`,
    "",
    `✍️ <b>Редакторы:</b> ${
      editors.length
        ? editors.map(escapeHtml).join(", ")
        : "не указаны"
    }`,
    `📊 <b>Заявленная сложность:</b> ${
      tournament.difficultyForecast ?? "не указана"
    }`,
    "",
    `<a href="https://rating.chgk.info/tournament/${tournament.id}">Страница турнира</a>`,
  ];

  return lines.join("\n");
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
