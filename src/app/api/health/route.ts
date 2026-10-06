export async function GET() {
  return Response.json(
    {
      status: "ok",
      service: "eletrotecnico-go",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
