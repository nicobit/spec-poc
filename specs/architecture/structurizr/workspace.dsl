workspace "Admin Portal" "Structured architecture workspace for the admin-portal repository." {
    !identifiers hierarchical
    !impliedRelationships false

    model {
        !include model/people.dsl
        !include model/software-systems.dsl
        !include model/containers.dsl
        !include model/components.dsl
    }

    views {
        !include views/system-context.dsl
        !include views/container-views.dsl
        !include views/component-views.dsl
        !include views/dynamic-views.dsl
        !include views/deployment-views.dsl

        theme default
    }

    styles {
        !include styles/styles.dsl
    }
}

