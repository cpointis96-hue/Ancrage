# Séparer le cockpit local du Control Plane cloud

Status: accepted

Ancrage utilise un cockpit et un moteur de travail locaux sur le Mac, tandis qu'un Control Plane cloud minimal reste disponible pour recevoir les demandes, conserver les états et coordonner les reprises lorsque le Mac est éteint. Cette séparation évite d'exposer les outils locaux sur Internet sans rendre le service public dépendant de la disponibilité du Mac.
