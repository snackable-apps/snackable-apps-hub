# Formato do CSV de Jogadores

Este arquivo descreve o formato esperado do arquivo CSV para importação dos dados dos jogadores.

## Estrutura das Colunas

1. **name** (obrigatório): Nome completo do jogador
2. **nationality** (obrigatório): Nacionalidade (pode ser múltipla, separada por `|`)
3. **currentClub** (obrigatório): Clube atual (use "Aposentado" para jogadores aposentados)
4. **leaguesPlayed** (obrigatório): Ligas onde jogou, separadas por `|` (ex: `Brasileirão|La Liga|Premier League`)
5. **primaryPosition** (obrigatório): Posição principal (ex: `Atacante`, `Meio-campo`, `Defensor`, `Goleiro`)
6. **dateOfBirth** (obrigatório): Data de nascimento no formato `YYYY-MM-DD` (ex: `1992-02-05`)
7. **preferredFoot** (obrigatório): Pé preferido (`Direito`, `Esquerdo`, ou `Ambidestro`)
8. **height** (obrigatório): Altura em centímetros (número inteiro, ex: `175`)
9. **individualTitles** (opcional): Títulos individuais, separados por `|` (ex: `Bola de Ouro|Chuteira de Ouro`). Deixe vazio se não houver.
10. **teamTitles** (opcional): Títulos coletivos, separados por `|` (ex: `Copa do Mundo|Champions League`). Deixe vazio se não houver.
11. **playedWorldCup** (obrigatório): Se jogou Copa do Mundo (`Yes` ou `No`)
12. **difficulty** (obrigatório): Dificuldade do jogador (`easy`, `medium`, ou `hard`)

## Regras Importantes

- **Separador de arrays**: Use o caractere pipe `|` para separar múltiplos valores em campos de array (leaguesPlayed, individualTitles, teamTitles, nationality)
- **Campos vazios**: Se um campo de array estiver vazio, deixe a célula vazia (não coloque nada)
- **Booleanos**: Use `Yes` ou `No` para o campo `playedWorldCup`
- **Encoding**: O arquivo deve estar em UTF-8 para suportar caracteres especiais
- **Sem espaços extras**: Evite espaços antes ou depois dos valores (exceto dentro dos próprios valores)

## Exemplos

### Jogador com múltiplos títulos:
```csv
name,nationality,currentClub,leaguesPlayed,primaryPosition,dateOfBirth,preferredFoot,height,individualTitles,teamTitles,playedWorldCup,difficulty
Lionel Messi,Argentina,Inter Miami,La Liga|Ligue 1|MLS,Atacante,1987-06-24,Esquerdo,170,Bola de Ouro|FIFA The Best|Chuteira de Ouro,Copa do Mundo|Champions League|La Liga|Ligue 1,Yes,easy
```

### Jogador sem títulos individuais:
```csv
name,nationality,currentClub,leaguesPlayed,primaryPosition,dateOfBirth,preferredFoot,height,individualTitles,teamTitles,playedWorldCup,difficulty
Erling Haaland,Noruega,Manchester City,Bundesliga|Premier League,Atacante,2000-07-21,Esquerdo,194,,Champions League|Premier League|Bundesliga,No,easy
```

### Jogador aposentado:
```csv
name,nationality,currentClub,leaguesPlayed,primaryPosition,dateOfBirth,preferredFoot,height,individualTitles,teamTitles,playedWorldCup,difficulty
Zinedine Zidane,França,Aposentado,Ligue 1|Serie A|La Liga,Meio-campo,1972-06-23,Ambidestro,185,Bola de Ouro,Copa do Mundo|Eurocopa|Champions League|La Liga|Serie A,Yes,medium
```

## Valores Possíveis

### primaryPosition:
- `Atacante`
- `Meio-campo`
- `Defensor`
- `Goleiro`

### preferredFoot:
- `Direito`
- `Esquerdo`
- `Ambidestro`

### playedWorldCup:
- `Yes`
- `No`

### difficulty:
- `easy`
- `medium`
- `hard`

## Ligas Comuns (para leaguesPlayed):

- `Brasileirão`
- `Serie A`
- `La Liga`
- `Premier League`
- `Bundesliga`
- `Ligue 1`
- `Primeira Liga`
- `Eredivisie`
- `Liga Portuguesa`
- `MLS`
- `Liga Saudita`
- `Liga Chinesa`
- `J-League`
- `Liga Turca`
- `Liga Russa`
- `Liga Ucraniana`
- `Liga Grega`
- `Primera División`
- `Liga Colombiana`
- `Copa Libertadores`

## Títulos Comuns

### individualTitles:
- `Bola de Ouro`
- `FIFA The Best`
- `Chuteira de Ouro`
- `Prêmios Individuais` (genérico)

### teamTitles:
- `Copa do Mundo`
- `Eurocopa`
- `Copa América`
- `Champions League`
- `Brasileirão`
- `Serie A`
- `La Liga`
- `Premier League`
- `Bundesliga`
- `Ligue 1`
- `Copa Libertadores`
- `Primeira Liga`
- `Liga Portuguesa`


