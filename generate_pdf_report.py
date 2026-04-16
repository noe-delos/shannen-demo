#!/usr/bin/env python3
"""Generate a non-technical delivery report PDF for Mission 1 — NeoCell."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

WIDTH, HEIGHT = A4
MARGIN = 20 * mm

# ── Colors ────────────────────────────────────────────────────────────────────
PURPLE       = colors.HexColor("#9516C7")
PURPLE_LIGHT = colors.HexColor("#F3E8FA")
PURPLE_MID   = colors.HexColor("#D8A8F0")
DARK         = colors.HexColor("#1A1A2E")
GREY         = colors.HexColor("#6B7280")
LIGHT_GREY   = colors.HexColor("#F9FAFB")
BORDER_GREY  = colors.HexColor("#E5E7EB")
GREEN        = colors.HexColor("#059669")
GREEN_LIGHT  = colors.HexColor("#D1FAE5")
ORANGE       = colors.HexColor("#D97706")
ORANGE_LIGHT = colors.HexColor("#FEF3C7")
RED          = colors.HexColor("#DC2626")
WHITE        = colors.white

# ── Styles ────────────────────────────────────────────────────────────────────
base = getSampleStyleSheet()

def S(name, **kw):
    return ParagraphStyle(name, parent=base["Normal"], **kw)

STYLES = {
    "title":      S("title",   fontSize=26, textColor=WHITE,  fontName="Helvetica-Bold", leading=32, alignment=TA_CENTER),
    "subtitle":   S("sub",     fontSize=12, textColor=PURPLE_MID, fontName="Helvetica", leading=16, alignment=TA_CENTER),
    "date":       S("date",    fontSize=9,  textColor=PURPLE_MID, fontName="Helvetica", alignment=TA_CENTER),
    "section":    S("sec",     fontSize=14, textColor=WHITE,   fontName="Helvetica-Bold", leading=20, spaceBefore=14, spaceAfter=6),
    "subsection": S("subsec",  fontSize=11, textColor=PURPLE,  fontName="Helvetica-Bold", leading=16, spaceBefore=10, spaceAfter=4),
    "body":       S("body",    fontSize=9.5,textColor=DARK,    leading=15, spaceAfter=5),
    "body_grey":  S("bodygr",  fontSize=9,  textColor=GREY,    leading=13, spaceAfter=4),
    "bullet":     S("bul",     fontSize=9.5,textColor=DARK,    leading=14, leftIndent=14, spaceAfter=3),
    "bullet2":    S("bul2",    fontSize=9,  textColor=GREY,    leading=13, leftIndent=28, spaceAfter=2),
    "tag_ok":     S("tagok",   fontSize=8,  textColor=GREEN,   fontName="Helvetica-Bold", leading=12),
    "tag_pend":   S("tagpend", fontSize=8,  textColor=ORANGE,  fontName="Helvetica-Bold", leading=12),
    "note_ok":    S("nok",     fontSize=9,  textColor=colors.HexColor("#065F46"), backColor=GREEN_LIGHT,
                               leading=13, leftIndent=8, rightIndent=8, spaceAfter=5, borderPad=6),
    "note_warn":  S("nwarn",   fontSize=9,  textColor=colors.HexColor("#92400E"), backColor=ORANGE_LIGHT,
                               leading=13, leftIndent=8, rightIndent=8, spaceAfter=5, borderPad=6),
    "label":      S("lbl",     fontSize=8,  textColor=GREY,    fontName="Helvetica-Bold", leading=11, spaceBefore=2),
    "highlight":  S("hl",      fontSize=10, textColor=DARK,    fontName="Helvetica-Bold", leading=15, spaceAfter=3),
}

def p(text, style="body"):
    return Paragraph(text, STYLES[style])

def sp(h=6):
    return Spacer(1, h)

def hr(color=BORDER_GREY, thickness=0.5):
    return HRFlowable(width="100%", thickness=thickness, color=color, spaceAfter=4, spaceBefore=4)

def section_header(text):
    """Purple banner for section titles."""
    data = [[Paragraph(text, STYLES["section"])]]
    t = Table(data, colWidths=[WIDTH - 2*MARGIN])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), PURPLE),
        ("LEFTPADDING", (0,0), (-1,-1), 12),
        ("RIGHTPADDING", (0,0), (-1,-1), 12),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,0), (-1,-1), [PURPLE]),
    ]))
    return [sp(10), t, sp(6)]

def status_badge(text, ok=True):
    color = "#059669" if ok else "#D97706"
    return f'<font color="{color}"><b>{text}</b></font>'

def feature_block(number, title, what, how_tested, result_ok=True, result_note=None, pending_note=None):
    """A complete feature card."""
    elements = []
    badge = "✅ Validé" if result_ok else "⏳ En attente"
    badge_style = "tag_ok" if result_ok else "tag_pend"

    # Title row
    title_data = [[
        Paragraph(f"<b>{number}. {title}</b>", STYLES["subsection"]),
        Paragraph(badge, STYLES[badge_style])
    ]]
    title_t = Table(title_data, colWidths=[WIDTH - 2*MARGIN - 60, 60])
    title_t.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("ALIGN", (1,0), (1,0), "RIGHT"),
        ("LEFTPADDING", (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
        ("TOPPADDING", (0,0), (-1,-1), 0),
        ("BOTTOMPADDING", (0,0), (-1,-1), 0),
    ]))
    elements.append(title_t)

    # What was done
    elements.append(p("Ce qui a été fait", "label"))
    elements.append(p(what))

    # How tested
    if how_tested:
        elements.append(p("Comment on l'a testé", "label"))
        for item in how_tested:
            elements.append(p(f"✓ {item}", "bullet"))

    # Result note
    if result_note:
        elements.append(p(result_note, "note_ok" if result_ok else "note_warn"))

    if pending_note:
        elements.append(p(pending_note, "note_warn"))

    elements.append(sp(4))
    elements.append(hr())
    return elements

def bug_card(title, description, highlight=False):
    """A bug fix card."""
    elements = []
    bg = PURPLE_LIGHT if highlight else LIGHT_GREY
    border = PURPLE if highlight else BORDER_GREY

    data = [[
        Paragraph(f"{'🎯 ' if highlight else '✅ '}<b>{title}</b>", STYLES["highlight"]),
        Paragraph(description, STYLES["body"])
    ]]
    t = Table(data, colWidths=[180, WIDTH - 2*MARGIN - 190])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), bg),
        ("LINEAFTER", (0,0), (0,-1), 1, border),
        ("LEFTPADDING", (0,0), (-1,-1), 10),
        ("RIGHTPADDING", (0,0), (-1,-1), 10),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("BOX", (0,0), (-1,-1), 0.5, border),
    ]))
    elements.append(t)
    elements.append(sp(5))
    return elements

# ── Page decorators ───────────────────────────────────────────────────────────

def header_footer(canvas, doc):
    canvas.saveState()
    # Top bar
    canvas.setFillColor(PURPLE)
    canvas.rect(0, HEIGHT - 10*mm, WIDTH, 10*mm, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 8.5)
    canvas.drawString(MARGIN, HEIGHT - 6.5*mm, "Mission 1 — NeoCell | Rapport de livraison")
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(WIDTH - MARGIN, HEIGHT - 6.5*mm, "Confidentiel · Avril 2026")
    # Bottom bar
    canvas.setFillColor(LIGHT_GREY)
    canvas.rect(0, 0, WIDTH, 8*mm, fill=1, stroke=0)
    canvas.setFillColor(GREY)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawCentredString(WIDTH/2, 3*mm, f"Page {doc.page}")
    canvas.restoreState()

def cover_page(canvas, doc):
    canvas.saveState()
    # Full purple background
    canvas.setFillColor(PURPLE)
    canvas.rect(0, 0, WIDTH, HEIGHT, fill=1, stroke=0)
    # Decorative circle
    canvas.setFillColor(colors.HexColor("#B04DE0"))
    canvas.circle(WIDTH - 40, HEIGHT - 40, 120, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#7A0FA8"))
    canvas.circle(40, 40, 80, fill=1, stroke=0)
    # Bottom bar
    canvas.setFillColor(colors.HexColor("#7A0FA8"))
    canvas.rect(0, 0, WIDTH, 15*mm, fill=1, stroke=0)
    canvas.setFillColor(PURPLE_MID)
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(WIDTH/2, 5*mm, "Confidentiel · LikaSrv · Avril 2026")
    canvas.restoreState()

# ── Build ─────────────────────────────────────────────────────────────────────

def build():
    out = "/Users/chanlika/code/LikaSrv/shannen-demo/mission1_neocell_rapport.pdf"
    doc = SimpleDocTemplate(
        out, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=25*mm, bottomMargin=15*mm,
        title="Mission 1 — NeoCell | Rapport de livraison",
    )

    story = []

    # ── COVER ──────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 60))
    story.append(p("Mission 1", "subtitle"))
    story.append(sp(4))
    story.append(p("NeoCell", "title"))
    story.append(sp(8))
    story.append(p("Rapport de livraison", "subtitle"))
    story.append(sp(16))
    story.append(p("Avril 2026", "date"))
    story.append(PageBreak())

    # ── 1. RÉSUMÉ EXÉCUTIF ─────────────────────────────────────────────────────
    story += section_header("1. Résumé exécutif")
    story.append(p(
        "Dans le cadre de la Mission 1, huit améliorations majeures ont été développées et livrées "
        "sur la plateforme NeoCell. Ces évolutions concernent principalement l'expérience des utilisateurs "
        "lors des simulations d'appels commerciaux : mémoire entre les appels, comportement plus réaliste "
        "du prospect IA, gestion du profil utilisateur, et plusieurs corrections de bugs."
    ))
    story.append(sp(4))
    story.append(p(
        "Sur les 9 points de livraison (en comptant les sous-points), <b>8 sont entièrement validés</b>. "
        "Un seul point reste à tester en conditions réelles : la réinitialisation du mot de passe, "
        "qui nécessite une configuration côté Shannen (voir section 5)."
    ))
    story.append(sp(6))

    # Summary table
    rows = [
        [p("<b>#</b>", "label"), p("<b>Fonctionnalité</b>", "label"), p("<b>Statut</b>", "label")],
        [p("1"), p("Mémoire entre les appels"), p(status_badge("✅ Validé"))],
        [p("2"), p("Durée d'appel configurable"), p(status_badge("✅ Validé"))],
        [p("3"), p("Limite de 3 appels par jour"), p(status_badge("✅ Validé"))],
        [p("4"), p("Migration technique (infrastructure)"), p(status_badge("✅ Validé"))],
        [p("5a"), p("Connexion & inscription"), p(status_badge("✅ OK"))],
        [p("5b"), p("Réinitialisation du mot de passe"), p(status_badge("⏳ À tester", ok=False))],
        [p("6"), p("Identifiant de conversation"), p(status_badge("✅ Validé"))],
        [p("7"), p("Page Profil utilisateur"), p(status_badge("✅ Validé"))],
        [p("8"), p("Comportement du prospect IA"), p(status_badge("✅ Validé"))],
    ]
    col_w = WIDTH - 2*MARGIN
    t = Table(rows, colWidths=[30, col_w - 130, 100])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), PURPLE),
        ("TEXTCOLOR", (0,0), (-1,0), WHITE),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, LIGHT_GREY]),
        ("GRID", (0,0), (-1,-1), 0.3, BORDER_GREY),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("ALIGN", (2,0), (2,-1), "CENTER"),
    ]))
    story.append(t)
    story.append(sp(10))

    # ── 2. FONCTIONNALITÉS ─────────────────────────────────────────────────────
    story += section_header("2. Fonctionnalités livrées")

    story += feature_block(
        "1", "Mémoire entre les appels",
        what=(
            "Avant cette mise à jour, chaque simulation démarrait de zéro — le prospect IA ne se "
            "souvenait d'aucun échange précédent. Désormais, l'utilisateur peut choisir, avant de "
            "lancer un appel, de fournir un contexte : soit en écrivant librement ce qui s'est passé "
            "lors des appels précédents, soit en sélectionnant directement des appels passés depuis "
            "l'historique. Le prospect IA intègre ces informations dans sa façon de répondre, rendant "
            "la simulation beaucoup plus réaliste."
        ),
        how_tested=[
            "Deux simulations lancées avec le même prospect et le même produit → l'historique s'affiche correctement",
            "Simulation avec un prospect différent → pas d'historique proposé (comportement attendu)",
            "Simulation avec le même prospect mais un produit différent → pas d'historique proposé",
            "Historique saisi manuellement → le prospect IA jouait bien le contexte de relance post-devis lors de l'appel suivant",
        ],
        result_note="✅ Validé le 16/04/2026 — le prospect IA se souvient bien des échanges précédents."
    )

    story += feature_block(
        "2", "Durée d'appel configurable",
        what=(
            "L'utilisateur peut maintenant choisir la durée maximale de chaque simulation : 30, 45 ou "
            "60 minutes (45 min par défaut). Un compteur visible pendant l'appel indique le temps "
            "restant, passe à l'orange à 5 minutes de la fin, et au rouge à 1 minute. Cela permet "
            "de mieux calibrer l'entraînement selon le type d'appel simulé."
        ),
        how_tested=[
            "Le menu déroulant est bien visible à l'étape 4 du wizard avec 45 min présélectionné",
            "La durée choisie est bien enregistrée et transmise à ElevenLabs",
            "Le timer affiché pendant l'appel change de couleur aux bons moments",
        ],
        result_note="✅ Validé — la durée configurable fonctionne correctement."
    )

    story += feature_block(
        "3", "Limite de 3 appels par jour",
        what=(
            "Pour maîtriser les coûts liés à ElevenLabs, chaque utilisateur est maintenant limité à "
            "3 simulations par jour. Un indicateur visible dans le tableau de bord et dans la barre "
            "latérale affiche le nombre de simulations restantes. Quand la limite est atteinte, le "
            "bouton de démarrage se désactive avec un message clair."
        ),
        how_tested=[
            "3 simulations effectuées le même jour → la 4ème est bien bloquée",
            "Le compteur s'affiche correctement dans la sidebar et le tableau de bord",
            "Le message 'Limite atteinte · Revenez demain' s'affiche bien",
        ],
        result_note="✅ Validé le 16/04/2026."
    )

    story += feature_block(
        "4", "Migration de l'infrastructure IA",
        what=(
            "La plateforme utilisait Amazon Web Services (Bedrock) pour générer les feedbacks après "
            "chaque appel. Ce service a été remplacé par une connexion directe à l'API Anthropic "
            "(Claude), ce qui simplifie l'architecture technique, réduit les coûts et améliore la "
            "fiabilité. Le feedback généré à la fin de chaque appel, ainsi que le résumé utilisé "
            "pour la mémoire inter-appels, transitent maintenant par cette nouvelle connexion."
        ),
        how_tested=[
            "Plusieurs simulations effectuées → feedbacks générés correctement avec note, points forts, axes d'amélioration",
            "Résumés d'appels générés et stockés automatiquement après chaque simulation",
            "Testé quand l'utilisateur raccroche manuellement → ✅ OK",
            "Testé quand ElevenLabs raccroche automatiquement → ✅ OK",
        ],
        result_note="✅ Validé le 15/04/2026."
    )

    story += feature_block(
        "5a", "Connexion & inscription",
        what=(
            "Vérification du flux de connexion et d'inscription — aucun bug identifié. "
            "Les redirections après connexion et après création de compte fonctionnent correctement."
        ),
        how_tested=["Flux de connexion et d'inscription vérifiés — aucune anomalie."],
        result_note="✅ Aucune correction nécessaire."
    )

    story += feature_block(
        "5b", "Réinitialisation du mot de passe",
        what=(
            "Le code de réinitialisation de mot de passe est en place et fonctionnel. Pour que les "
            "emails de réinitialisation pointent vers la bonne adresse (et non vers localhost), "
            "une variable de configuration doit être ajoutée côté Shannen dans les paramètres Vercel."
        ),
        how_tested=["Test en attente — nécessite la configuration de NEXT_PUBLIC_SITE_URL dans Vercel."],
        result_ok=False,
        pending_note="⏳ Action requise côté Shannen : ajouter NEXT_PUBLIC_SITE_URL = https://shannen-demo.vercel.app dans les variables d'environnement Vercel."
    )

    story += feature_block(
        "6", "Correction de l'identifiant de conversation",
        what=(
            "Un problème technique faisait que l'identifiant enregistré après chaque appel ElevenLabs "
            "était incorrect (c'était l'identifiant de l'agent au lieu de celui de la conversation). "
            "Ce bug a été corrigé — chaque appel est maintenant correctement référencé, ce qui "
            "permettra notamment de récupérer les transcripts directement depuis ElevenLabs si besoin."
        ),
        how_tested=["Vérification en base de données après plusieurs appels → l'identifiant commence bien par 'conv_' (et non 'agent_')"],
        result_note="✅ Validé le 16/04/2026."
    )

    story += feature_block(
        "7", "Page Profil utilisateur",
        what=(
            "Une nouvelle page de profil a été créée. L'utilisateur peut y : uploader une photo de "
            "profil (visible dans la barre latérale et le header), renseigner son prénom/nom, "
            "définir un secteur d'activité et une entreprise par défaut (pré-remplis automatiquement "
            "à chaque nouvelle simulation), et changer son mot de passe."
        ),
        how_tested=[
            "Upload de photo → s'affiche correctement dans la sidebar et le header",
            "Secteur et entreprise sauvegardés → bien pré-remplis à l'étape 4 du wizard lors de la simulation suivante",
            "Changement de mot de passe → déconnexion et reconnexion avec le nouveau mot de passe OK",
        ],
        result_note="✅ Validé le 15/04/2026."
    )

    story += feature_block(
        "8", "Comportement du prospect IA",
        what=(
            "Le prompt (les instructions) envoyé au prospect IA a été entièrement revu pour rendre "
            "les simulations plus réalistes. Le prospect réagit maintenant de façon progressive selon "
            "la qualité du discours commercial : il est d'abord froid et distant, puis peut s'ouvrir "
            "si l'accroche est pertinente, ou raccrocher si le vendeur est trop mauvais. "
            "Le comportement varie aussi selon le type d'appel (cold call, relance, démo, closing). "
            "Les réponses sont courtes et naturelles, sans formules robotiques."
        ),
        how_tested=[
            "Simulation cold call → le prospect démarre froid, résistance progressive bien présente",
            "Simulation follow-up → le prospect reconnaît le contexte de la relance",
            "Le prospect raccroche automatiquement si le commercial est trop mauvais → ✅ confirmé",
            "Absence de formules IA type 'C'est une excellente question' → ✅ confirmé",
            "Réponses courtes, en français uniquement → ✅ confirmé",
        ],
        result_note="✅ Validé le 16/04/2026."
    )

    # ── 3. BUGS CORRIGÉS ───────────────────────────────────────────────────────
    story += section_header("3. Bugs & corrections")

    story.append(p(
        "En parallèle des fonctionnalités principales, plusieurs bugs ont été identifiés et corrigés. "
        "La correction phare est mise en avant ci-dessous.",
        "body"
    ))
    story.append(sp(8))

    # Highlight bug
    story += bug_card(
        "Le prospect raccroche tout seul",
        "Avant la correction, le prospect IA ne raccrocherait jamais de lui-même, "
        "même si le commercial faisait n'importe quoi. Désormais, si le discours est "
        "trop mauvais ou trop répétitif, le prospect met fin à l'appel naturellement — "
        "exactement comme dans la réalité. Ce comportement rend la simulation beaucoup "
        "plus formatrice.",
        highlight=True
    )

    story.append(sp(4))
    story.append(p("Autres corrections", "subsection"))
    story.append(sp(4))

    other_bugs = [
        ("Feedback toujours identique", "Le feedback affiché après chaque appel était toujours le même texte générique ('Conversation complétée'). Cause : le modèle IA utilisé n'était plus disponible. Corrigé en passant sur un modèle fonctionnel."),
        ("Le feedback disparaissait quand ElevenLabs raccrochait", "Quand c'était le prospect IA qui mettait fin à l'appel (et non l'utilisateur), le feedback n'était pas généré. Bug corrigé — le feedback est maintenant généré dans les deux cas."),
        ("Limite de simulations mal comptée", "La 3ème simulation était bloquée au lieu de la 4ème. Corrigé."),
        ("Dates affichées incorrectement", "Une conversation de la veille pouvait s'afficher avec la mention 'Aujourd'hui'. La logique de comparaison des dates a été corrigée."),
        ("Post-it de briefing trop court", "Dans l'écran de simulation, le post-it récapitulatif à gauche coupait le texte. Le bug d'affichage a été corrigé — tout le texte est maintenant visible."),
        ("Photo de profil manquante", "Certains prospects n'avaient pas de photo, ce qui affichait une image cassée. Remplacé par un avatar généré automatiquement avec les initiales sur fond violet."),
        ("Photos manquantes partout", "Le fichier image par défaut utilisé en fallback n'existait pas sur le serveur, causant des images cassées dans le dashboard, les conversations et les simulations. Remplacé partout par le système d'avatar automatique."),
        ("Erreurs techniques d'affichage (hydration)", "Des erreurs silencieuses dans le code HTML des boîtes de dialogue de suppression ont été corrigées pour éviter tout dysfonctionnement potentiel."),
        ("Historique de relation mal pré-rempli", "À l'étape 4 du wizard, la valeur 'Historique de la relation' restait bloquée sur la dernière valeur utilisée. Elle est maintenant toujours réinitialisée à 'Premier contact' par défaut."),
    ]

    for title, desc in other_bugs:
        story += bug_card(title, desc, highlight=False)

    # ── 4. SUGGESTIONS ─────────────────────────────────────────────────────────
    story += section_header("4. Suggestions d'améliorations futures")

    story.append(p(
        "Ces suggestions ne font pas partie du périmètre de la Mission 1 mais ont été identifiées "
        "au cours du développement comme des améliorations à fort impact.",
        "body_grey"
    ))
    story.append(sp(8))

    suggestions = [
        (
            "Raccourcis dans le wizard de simulation",
            "Actuellement, si l'utilisateur veut créer un nouveau prospect ou un nouveau produit pendant "
            "qu'il configure sa simulation, il doit quitter le wizard et perdre sa progression. "
            "Ajouter des boutons 'Créer un prospect' et 'Créer un produit' directement dans les étapes "
            "concernées permettrait de fluidifier l'expérience."
        ),
        (
            "Génération automatique de la description du prospect",
            "La qualité du comportement du prospect IA dépend directement de la richesse de sa description "
            "renseignée lors de la création. Si la description est vague, le prospect répète les mêmes "
            "phrases génériques d'un appel à l'autre. "
            "Suggestion : ajouter un bouton 'Générer avec l'IA' qui, à partir du nom, du poste et du "
            "niveau de difficulté choisis, génère automatiquement une description de personnalité riche "
            "et réaliste."
        ),
    ]

    for i, (title, desc) in enumerate(suggestions, 1):
        data = [[
            Paragraph(f"<b>{i}. {title}</b>", STYLES["subsection"]),
            Paragraph(desc, STYLES["body"])
        ]]
        t = Table(data, colWidths=[170, WIDTH - 2*MARGIN - 180])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,-1), LIGHT_GREY),
            ("LINEAFTER", (0,0), (0,-1), 2, PURPLE),
            ("LEFTPADDING", (0,0), (-1,-1), 10),
            ("RIGHTPADDING", (0,0), (-1,-1), 10),
            ("TOPPADDING", (0,0), (-1,-1), 10),
            ("BOTTOMPADDING", (0,0), (-1,-1), 10),
            ("VALIGN", (0,0), (-1,-1), "TOP"),
            ("BOX", (0,0), (-1,-1), 0.3, BORDER_GREY),
        ]))
        story.append(t)
        story.append(sp(6))

    # ── 5. POINTS EN ATTENTE ───────────────────────────────────────────────────
    story += section_header("5. Points en attente / Actions requises")

    story.append(p(
        "Les éléments suivants nécessitent une action ou une décision avant de pouvoir être clôturés.",
        "body_grey"
    ))
    story.append(sp(8))

    pending = [
        (
            "⏳ Test du reset password",
            "Le code est en place. Il faut ajouter la variable NEXT_PUBLIC_SITE_URL dans les paramètres "
            "Vercel, puis tester le flow complet : demande de reset → email reçu → nouveau mot de passe → reconnexion.",
            "Action : Shannen ajoute la variable dans Vercel, puis teste le flow."
        ),
        (
            "🔑 Nouvelle clé API Anthropic",
            "La clé API actuelle ne donne accès qu'à un ancien modèle (claude-3-haiku). Les modèles "
            "plus récents et plus performants retournent une erreur. Une nouvelle clé avec accès "
            "aux modèles récents améliorerait significativement la qualité des feedbacks et des résumés.",
            "Action : Shannen fournit une nouvelle clé API Anthropic avec accès aux modèles récents."
        ),
        (
            "🗑️ Nettoyage AWS",
            "Maintenant qu'Amazon Bedrock n'est plus utilisé, les variables d'accès AWS peuvent être "
            "supprimées de Vercel et les clés IAM désactivées dans la console AWS.",
            "Action : Shannen supprime les variables AWS dans Vercel et désactive les clés IAM."
        ),
        (
            "📝 Résumés des anciens appels",
            "852 conversations existantes n'ont pas de résumé (cette fonctionnalité n'existait pas avant). "
            "Ces appels n'apparaissent donc pas dans le sélecteur 'Reprendre l'historique'. "
            "On peut générer ces résumés rétroactivement, mais cela représente 852 appels à l'IA (coût à évaluer).",
            "Décision : générer les résumés rétroactivement oui/non ? Pour tous les utilisateurs ou seulement certains ?"
        ),
    ]

    for title, desc, action in pending:
        data = [[
            Paragraph(f"<b>{title}</b>", STYLES["highlight"]),
        ], [
            Paragraph(desc, STYLES["body"]),
        ], [
            Paragraph(f"<i>{action}</i>", STYLES["note_warn"]),
        ]]
        t = Table(data, colWidths=[WIDTH - 2*MARGIN])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,-1), LIGHT_GREY),
            ("BACKGROUND", (0,0), (-1,0), ORANGE_LIGHT),
            ("LEFTPADDING", (0,0), (-1,-1), 10),
            ("RIGHTPADDING", (0,0), (-1,-1), 10),
            ("TOPPADDING", (0,0), (-1,-1), 6),
            ("BOTTOMPADDING", (0,0), (-1,-1), 6),
            ("BOX", (0,0), (-1,-1), 0.5, ORANGE),
            ("LINEBELOW", (0,0), (-1,0), 0.5, BORDER_GREY),
            ("LINEBELOW", (0,1), (-1,1), 0.5, BORDER_GREY),
        ]))
        story.append(t)
        story.append(sp(8))

    # Build
    doc.build(story, onFirstPage=cover_page, onLaterPages=header_footer)
    print(f"✅ PDF généré : {out}")

if __name__ == "__main__":
    build()
