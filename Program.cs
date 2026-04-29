using System.Collections.Concurrent;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Configurar arquivos estáticos
app.UseDefaultFiles();
app.UseStaticFiles();

// Estrutura para armazenar pontuações
var scores = new ConcurrentBag<ScoreEntry>();
var random = new Random();

// Endpoint para salvar pontuação
app.MapPost("/score", async (HttpContext context) =>
{
    try
    {
        var request = await JsonSerializer.DeserializeAsync<ScoreRequest>(context.Request.Body);
        if (request == null || string.IsNullOrWhite(request.PlayerName))
        {
            return Results.BadRequest(new { error = "Nome do jogador é obrigatório" });
        }

        var entry = new ScoreEntry
        {
            Id = Guid.NewGuid().ToString(),
            PlayerName = request.PlayerName[..Math.Min(20, request.PlayerName.Length)],
            Score = request.Score,
            Date = DateTime.UtcNow
        };

        scores.Add(entry);
        
        // Manter apenas os top 50 scores
        var topScores = scores.OrderByDescending(s => s.Score).Take(50).ToList();
        scores.Clear();
        foreach (var score in topScores)
        {
            scores.Add(score);
        }

        return Results.Ok(new { success = true, id = entry.Id });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = "Erro ao salvar pontuação" });
    }
});

// Endpoint para obter ranking
app.MapGet("/score", () =>
{
    var ranking = scores
        .OrderByDescending(s => s.Score)
        .Take(5)
        .Select((s, index) => new RankingEntry
        {
            Position = index + 1,
            PlayerName = s.PlayerName,
            Score = s.Score
        })
        .ToList();

    return Results.Ok(ranking);
});

app.Run();

// Modelos
public class ScoreRequest
{
    public string? PlayerName { get; set; }
    public int Score { get; set; }
}

public class ScoreEntry
{
    public string Id { get; set; } = string.Empty;
    public string PlayerName { get; set; } = string.Empty;
    public int Score { get; set; }
    public DateTime Date { get; set; }
}

public class RankingEntry
{
    public int Position { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public int Score { get; set; }
}
