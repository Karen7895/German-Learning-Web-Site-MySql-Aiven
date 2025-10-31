document.addEventListener("DOMContentLoaded", () => {
  const filterButtons = Array.from(document.querySelectorAll("[data-level-filter]"))
  const storyCards = Array.from(document.querySelectorAll("[data-level]"))

  if (!filterButtons.length || !storyCards.length) {
    return
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetLevel = button.dataset.levelFilter

      filterButtons.forEach((btn) => btn.classList.toggle("is-active", btn === button))

      storyCards.forEach((card) => {
        const cardLevel = card.dataset.level
        const shouldShow = targetLevel === "all" || cardLevel === targetLevel
        card.style.display = shouldShow ? "" : "none"
        card.classList.toggle("is-hidden", !shouldShow)
      })
    })
  })
})
