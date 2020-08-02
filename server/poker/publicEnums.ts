//These are enums, they allow certain values to be assigned by using placeholders, this ensures better consistneancy.
export enum PokerAction {
    Check = "CHECK",
    Call = "CALL",
    Raise = "RAISE",
    Fold = "FOLD",
    Null = "NULL",
    Await = "AWAITING RESPONSE"

}

export enum GameState {
    Lobby = "LOBBY",
    PreGame= "PRE-GAME",
    PreFlop = "PRE-FLOP",
    Flop = "FLOP",
    Turn = "TURN",
    River = "RIVER",
    Showdown = "SHOWDOWN",
    Payout = "PAYOUT"
}

export enum RoundAction {
    Lobby = "LOBBY",
    NewRound = "NEW ROUND",
    CardsDealt = "CARDS DEALT",
    AwaitDecision = "AWAITING DECISION",
    DecisionMade = "DECISION MADE",
    Timeout = "TIMEOUT"

}

export enum RoundMode {
    Lobby = "LOBBY",
    Checking = "CHECKING",
    Calling = "CALLING",
    Showdown = "SHOWDOWN"
}