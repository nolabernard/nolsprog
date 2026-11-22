import json,os,html
GREEN='#0B4D3B';INK='#173C30';TEXT='#526158';MUTED='#899188';BG='#F5E8D5';CARD='#FFFCF6';LINE='#E8E0D3';SOFT='#EFE5D6'
def page(title,pre,kicker,h1,body,cta=None,url=None,code=None,note='',warn=None):
    p=lambda t:f'<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:{TEXT};">{t}</p>'
    parts=''.join(p(x) for x in body)
    if code: parts+=f'''<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px auto 24px;"><tr><td align="center" style="background:{SOFT};border-radius:12px;padding:16px 26px;font-family:'Courier New',Courier,monospace;font-size:30px;font-weight:bold;letter-spacing:8px;color:{INK};">{code}</td></tr></table>'''
    if cta: parts+=f'''<table role="presentation" cellpadding="0" cellspacing="0" style="margin:10px auto 8px;"><tr><td align="center" bgcolor="{GREEN}" style="border-radius:12px;"><a href="{url}" target="_blank" style="display:inline-block;padding:17px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:12px;">{cta}</a></td></tr></table>
<p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:{MUTED};">Le bouton ne marche pas ? Copie ce lien dans ton navigateur :<br><a href="{url}" style="color:{GREEN};word-break:break-all;">{url}</a></p>'''
    if warn: parts+=f'''<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;"><tr><td style="background:{SOFT};border-left:3px solid {GREEN};border-radius:8px;padding:14px 16px;font-size:13px;line-height:1.6;color:{INK};text-align:left;">{warn}</td></tr></table>'''
    if note: parts+=f'<p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:{MUTED};">{note}</p>'
    return f'''<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>{title} — STEROID</title>
</head>
<body style="margin:0;padding:0;background:{BG};font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:{BG};">{pre}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{BG};">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:{CARD};border-radius:20px;border:1px solid {LINE};">
<tr><td align="center" style="padding:38px 30px 8px;">
<div style="font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:30px;font-weight:900;font-style:italic;letter-spacing:1px;color:{GREEN};">STEROID</div>
<div style="height:3px;width:44px;background:{GREEN};border-radius:2px;margin:18px auto 0;"></div>
</td></tr>
<tr><td align="center" style="padding:24px 32px 8px;">
<p style="margin:0 0 14px;font-size:11px;letter-spacing:2px;font-weight:bold;color:{GREEN};text-transform:uppercase;">{kicker}</p>
<h1 style="margin:0 0 22px;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:27px;line-height:1.2;font-weight:900;color:{INK};">{h1}</h1>
{parts}
</td></tr>
<tr><td align="center" style="padding:30px 30px 30px;">
<div style="border-top:1px solid {LINE};padding-top:20px;font-size:12px;line-height:1.6;color:#7B8179;">
Un programme. Des performances. Ta progression.<br>
Cet e-mail a été envoyé à {{{{ .Email }}}} par STEROID.<br>
<a href="https://nolabernard.github.io/nolsprog/" style="color:{GREEN};text-decoration:none;font-weight:bold;">Ouvrir l’app</a>
</div>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
'''
U='{{ .ConfirmationURL }}'
NOTME='Ce n’était pas toi ? Change ton mot de passe tout de suite depuis l’app (« Mot de passe oublié » sur l’écran de connexion).'
T={
'confirm-sign-up':('STEROID — Confirme ton adresse e-mail',page('Confirme ton inscription','Un clic pour activer ton compte et accéder à ton programme.','Bienvenue dans l’équipe','Ton prochain niveau commence ici.',['Ton compte est presque prêt. Confirme ton adresse e-mail pour accéder à ton programme, suivre tes séances et voir tes progrès semaine après semaine.'],'Confirmer mon adresse e-mail',U,note='Tu n’as pas créé de compte ? Ignore simplement cet e-mail.')),
'invite-user':('STEROID — Tu es invité à rejoindre l’app',page('Invitation','Ton accès à STEROID t’attend.','Invitation','Ton programme t’attend.',['Tu as été invité à rejoindre STEROID, l’app qui te guide séance après séance : programme adapté, charges notées, progrès visibles.','Accepte l’invitation pour créer ton compte.'],'Accepter l’invitation',U,note='Tu ne connais pas l’expéditeur ? Ignore simplement cet e-mail.')),
'magic-link-or-otp':('STEROID — Ton lien de connexion',page('Connexion','Ton lien de connexion à STEROID.','Connexion','Connecte-toi en un clic.',['Touche le bouton pour te connecter à STEROID sur cet appareil. Tu peux aussi saisir ce code dans l’app :'],'Me connecter',U,code='{{ .Token }}',note='Le lien et le code ne servent qu’une fois et expirent rapidement. Tu n’as rien demandé ? Ignore cet e-mail : personne ne peut se connecter sans lui.')),
'change-email-address':('STEROID — Confirme ta nouvelle adresse e-mail',page('Nouvelle adresse e-mail','Confirme le changement d’adresse de ton compte.','Changement d’adresse','Confirme ta nouvelle adresse.',['Tu as demandé à remplacer <b style="color:'+INK+';">{{ .Email }}</b> par <b style="color:'+INK+';">{{ .NewEmail }}</b> pour ton compte STEROID.','Confirme pour que le changement soit pris en compte.'],'Confirmer le changement',U,warn='Tu n’as pas demandé ce changement ? Ne clique pas et change ton mot de passe depuis l’app.')),
'reset-password':('STEROID — Réinitialise ton mot de passe',page('Mot de passe oublié','Choisis un nouveau mot de passe pour ton compte.','Mot de passe oublié','On te remet en selle.',['Tu as demandé à réinitialiser le mot de passe de ton compte STEROID. Touche le bouton pour en choisir un nouveau.'],'Choisir un nouveau mot de passe',U,note='Le lien expire rapidement et ne sert qu’une fois. Tu n’as rien demandé ? Ignore cet e-mail : ton mot de passe actuel reste valable.')),
'reauthentication':('STEROID — Ton code de vérification : {{ .Token }}',page('Code de vérification','Ton code pour confirmer une action sensible.','Vérification','Confirme que c’est bien toi.',['Pour terminer une action sensible sur ton compte, saisis ce code dans l’app :'],code='{{ .Token }}',note='Ce code expire rapidement. Tu n’as rien demandé ? Ignore cet e-mail et change ton mot de passe par précaution.')),
'password-changed':('STEROID — Ton mot de passe a été modifié',page('Mot de passe modifié','Le mot de passe de ton compte vient de changer.','Sécurité','Mot de passe modifié.',['Le mot de passe de ton compte STEROID ({{ .Email }}) vient d’être modifié.','Si c’est toi, tout est en ordre : rien à faire.'],warn=NOTME)),
'email-address-changed':('STEROID — Ton adresse e-mail a été modifiée',page('Adresse e-mail modifiée','L’adresse de ton compte vient de changer.','Sécurité','Adresse e-mail modifiée.',['L’adresse de ton compte STEROID est passée de <b style="color:'+INK+';">{{ .OldEmail }}</b> à <b style="color:'+INK+';">{{ .Email }}</b>.','Si c’est toi, tout est en ordre : rien à faire.'],warn=NOTME)),
'phone-number-changed':('STEROID — Ton numéro de téléphone a été modifié',page('Numéro modifié','Le numéro de ton compte vient de changer.','Sécurité','Numéro de téléphone modifié.',['Le numéro de ton compte STEROID est passé de <b style="color:'+INK+';">{{ .OldPhone }}</b> à <b style="color:'+INK+';">{{ .Phone }}</b>.','Si c’est toi, tout est en ordre : rien à faire.'],warn=NOTME)),
'sign-in-method-linked':('STEROID — Nouveau moyen de connexion ajouté',page('Moyen de connexion ajouté','Un nouveau moyen de connexion a été lié à ton compte.','Sécurité','Nouveau moyen de connexion.',['Le moyen de connexion <b style="color:'+INK+';">{{ .Provider }}</b> vient d’être lié à ton compte STEROID ({{ .Email }}).','Si c’est toi, tout est en ordre : rien à faire.'],warn=NOTME)),
'sign-in-method-removed':('STEROID — Moyen de connexion retiré',page('Moyen de connexion retiré','Un moyen de connexion a été retiré de ton compte.','Sécurité','Moyen de connexion retiré.',['Le moyen de connexion <b style="color:'+INK+';">{{ .Provider }}</b> a été retiré de ton compte STEROID ({{ .Email }}).','Si c’est toi, tout est en ordre : rien à faire.'],warn=NOTME)),
'mfa-method-added':('STEROID — Nouvelle vérification en deux étapes',page('Vérification ajoutée','Une méthode de vérification a été ajoutée à ton compte.','Sécurité','Vérification en deux étapes ajoutée.',['Une méthode de vérification (<b style="color:'+INK+';">{{ .FactorType }}</b>) a été ajoutée à ton compte STEROID ({{ .Email }}). Ton compte est mieux protégé.','Si c’est toi, tout est en ordre : rien à faire.'],warn=NOTME)),
'mfa-method-removed':('STEROID — Vérification en deux étapes retirée',page('Vérification retirée','Une méthode de vérification a été retirée de ton compte.','Sécurité','Vérification en deux étapes retirée.',['Une méthode de vérification (<b style="color:'+INK+';">{{ .FactorType }}</b>) a été retirée de ton compte STEROID ({{ .Email }}).','Si c’est toi, tout est en ordre : rien à faire.'],warn=NOTME)),
}
out=os.path.dirname(os.path.abspath(__file__));os.makedirs(out,exist_ok=True)
for k,(s,h) in T.items(): open(f'{out}/{k}.html','w').write(h)

print(len(T),'modèles écrits dans',out)
