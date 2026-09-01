// =========================
// MENU MOBILE
// =========================

const menuButton = document.getElementById("menuButton");
const mobileMenu = document.getElementById("mobileMenu");

menuButton.addEventListener("click", () => {

    mobileMenu.classList.toggle("active");

});


// Fecha o menu ao clicar em uma opção

const mobileLinks =
    document.querySelectorAll(".mobile-menu a");

mobileLinks.forEach(link => {

    link.addEventListener("click", () => {

        mobileMenu.classList.remove("active");

    });

});


// =========================
// MÉTRICAS
// =========================

const counters =
    document.querySelectorAll("[data-target]");


const startCounter = (counter) => {

    const target =
        Number(counter.dataset.target);

    let current = 0;

    const increment =
        Math.max(1, Math.ceil(target / 40));


    const update = () => {

        current += increment;

        if (current >= target) {

            counter.textContent = target;

            return;

        }

        counter.textContent = current;

        requestAnimationFrame(update);

    };


    update();

};


// Observa quando as métricas aparecem

const observer =
    new IntersectionObserver(
        entries => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {

                    const counters =
                        entry.target.querySelectorAll(
                            "[data-target]"
                        );

                    counters.forEach(counter => {

                        startCounter(counter);

                    });

                    observer.unobserve(
                        entry.target
                    );

                }

            });

        },
        {
            threshold: 0.3
        }
    );


const metrics =
    document.querySelector(".metrics");


if (metrics) {

    observer.observe(metrics);

}
