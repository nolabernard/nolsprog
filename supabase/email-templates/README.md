# E-mails STEROID (Supabase Auth)

Les 13 e-mails envoyés par Supabase, en français, à la charte STEROID (crème #F5E8D5, vert #0B4D3B).
Supabase utilise les versions enregistrées dans son tableau de bord (Authentication → Emails) :
ces fichiers en sont la copie de référence. Pour modifier : changer `generer.py`, lancer `python3 generer.py`,
puis recoller le fichier et l'objet dans le tableau de bord.

Les e-mails de sécurité (mot de passe, adresse, téléphone, moyens de connexion, vérification en deux étapes)
sont prêts mais désactivés dans Supabase (« Enable notification »).

| Fichier | Objet |
|---|---|
| `confirm-sign-up.html` | STEROID — Confirme ton adresse e-mail |
| `invite-user.html` | STEROID — Tu es invité à rejoindre l’app |
| `magic-link-or-otp.html` | STEROID — Ton lien de connexion |
| `change-email-address.html` | STEROID — Confirme ta nouvelle adresse e-mail |
| `reset-password.html` | STEROID — Réinitialise ton mot de passe |
| `reauthentication.html` | STEROID — Ton code de vérification : {{ .Token }} |
| `password-changed.html` | STEROID — Ton mot de passe a été modifié |
| `email-address-changed.html` | STEROID — Ton adresse e-mail a été modifiée |
| `phone-number-changed.html` | STEROID — Ton numéro de téléphone a été modifié |
| `sign-in-method-linked.html` | STEROID — Nouveau moyen de connexion ajouté |
| `sign-in-method-removed.html` | STEROID — Moyen de connexion retiré |
| `mfa-method-added.html` | STEROID — Nouvelle vérification en deux étapes |
| `mfa-method-removed.html` | STEROID — Vérification en deux étapes retirée |
