FUNCTION zmcp_adt_ddic_badi
  IMPORTING
    VALUE(iv_badi_definition) TYPE string
    VALUE(iv_customer_only)   TYPE string DEFAULT 'X'
    VALUE(iv_active_only)     TYPE string DEFAULT 'X'
    VALUE(iv_include_methods) TYPE string DEFAULT 'X'
  EXPORTING
    VALUE(ev_subrc)   TYPE i
    VALUE(ev_message) TYPE string
    VALUE(ev_result)  TYPE string.

* ZMCP_ADT_DDIC_BADI - read-only BAdI implementation discovery for ECC 7.40+.
*
* Naming: 'DDIC' prefix denotes the ECC-bridge namespace shared with
* sibling FMs (DDIC_TABL/DTEL/DOMA/ACTIVATE), not a strict claim that
* BAdI is a DDIC object. The data does come from DDIC tables (SXS_*/SXC_*).
*
* Coverage:
*   classic BAdI (SE18/SE19, CL_EXITHANDLER=>GET_INSTANCE) - full,
*     via SXS_ATTR / SXS_INTER / SXC_EXIT / SXC_ATTR / SXC_CLASS / SXC_IMPSWH.
*   kernel BAdI (SE20, GET BADI / Enhancement Spot) - NOT covered;
*     returns kind='unknown' when def isn't in SXS_ATTR. Reason: ENHO
*     repository on ECC 7.40 needs CL_ENH_FACTORY traversal.
*
* Schema (verified against ECC 7.40 kernel — SXC_* family):
*   SXS_ATTR(EXIT_NAME, INSTANCE_GENERATION, IS_FILTER_DEPENDEND, ...) - def header
*   SXS_INTER(EXIT_NAME, INTER_NAME)                                  - def -> interface
*   SXC_EXIT(IMP_NAME, EXIT_NAME, FLT_VAL)                            - impl <-> def link (per filter)
*   SXC_ATTR(IMP_NAME, VERSION, ACTIVE, ...)                          - impl header (no def link)
*   SXC_CLASS(IMP_NAME, INTER_NAME, IMP_CLASS)                        - impl -> implementing class (joined via INTER_NAME)
*   SXC_IMPSWH(IMP_NAME, INTER_NAME, METHO_NAME, IMP_SWITCH)          - impl -> implemented method names
*
* History note:
*   The original implementation assumed SXC_ATTR contained the EXIT_NAME
*   reference and used ASSIGN COMPONENT fallback chains
*   (EXITNAME / EXIT_NAME / BADI_NAME, IMP_NAME / IMPNAME, etc.). That
*   assumption was wrong on every kernel — SXC_ATTR is a pure impl
*   header (no def link). The link lives in SXC_EXIT. Fixed 2026-04-29
*   after empirical schema introspection via cl_abap_structdescr.
*
* Result JSON:
*   {
*     "badi_definition": "ME_PROCESS_PO_CUST",
*     "kind": "classic" | "unknown",
*     "interface": "IF_EX_ME_PROCESS_PO_CUST",
*     "multi_use": true,
*     "filter_dependent": false,
*     "implementations": [
*       {
*         "impl_name": "ZIM_PO_VALIDATE",
*         "impl_class": "ZCL_IM_ME_PROCESS_PO_VAL",
*         "active": true,
*         "package": "ZMM_PO",
*         "methods_redefined": ["PROCESS_HEADER", "PROCESS_ITEM"]
*       }
*     ]
*   }

  TYPES: BEGIN OF ty_impl,
           impl_name         TYPE c LENGTH 30,
           impl_class        TYPE c LENGTH 30,
           active            TYPE abap_bool,
           package           TYPE devclass,
           methods_redefined TYPE STANDARD TABLE OF string WITH DEFAULT KEY,
         END OF ty_impl.

  TYPES: BEGIN OF ty_result,
           badi_definition  TYPE string,
           kind             TYPE string,
           interface        TYPE string,
           multi_use        TYPE abap_bool,
           filter_dependent TYPE abap_bool,
           implementations  TYPE STANDARD TABLE OF ty_impl WITH DEFAULT KEY,
         END OF ty_result.

  DATA: lv_def_name   TYPE c LENGTH 30,
        ls_sxs_attr   TYPE sxs_attr,
        ls_result     TYPE ty_result,
        lt_impl_names TYPE STANDARD TABLE OF sxc_exit-imp_name WITH DEFAULT KEY,
        lv_imp_name   TYPE sxc_exit-imp_name,
        lv_interface  TYPE sxs_inter-inter_name,
        lv_class      TYPE sxc_class-imp_class,
        lv_active     TYPE sxc_attr-active,
        lv_devclass   TYPE devclass,
        lt_methods    TYPE STANDARD TABLE OF sxc_impswh-metho_name WITH DEFAULT KEY,
        lv_method     TYPE sxc_impswh-metho_name.

  FIELD-SYMBOLS: <fv> TYPE any.

  CLEAR: ev_subrc, ev_message, ev_result.

  IF iv_badi_definition IS INITIAL.
    ev_subrc   = 4.
    ev_message = 'iv_badi_definition is required'.
    RETURN.
  ENDIF.

  lv_def_name = to_upper( iv_badi_definition ).
  ls_result-badi_definition = lv_def_name.
  ls_result-kind            = 'unknown'.

  TRY.
*     === Step 1: classic def header (SXS_ATTR.EXIT_NAME) ===
      SELECT SINGLE * FROM sxs_attr INTO ls_sxs_attr
        WHERE exit_name = lv_def_name.

      IF sy-subrc <> 0.
*       not classic - kernel/new BAdI not handled here.
        ev_subrc   = 0.
        ev_message = |BAdI def { lv_def_name } not in SXS_ATTR (classic). Kernel BAdI lookup not implemented|.
        ev_result = /ui2/cl_json=>serialize(
          data        = ls_result
          compress    = abap_true
          pretty_name = /ui2/cl_json=>pretty_mode-low_case ).
        RETURN.
      ENDIF.

      ls_result-kind = 'classic'.

*     Defensive flag extraction (kernel-varying field names — SXS_ATTR side
*     does vary across kernels, hence the ASSIGN COMPONENT here).
      ASSIGN COMPONENT 'INSTANCE_GENERATION' OF STRUCTURE ls_sxs_attr TO <fv>.
      IF sy-subrc = 0 AND <fv> = 'M'.
        ls_result-multi_use = abap_true.
      ENDIF.
      ASSIGN COMPONENT 'IS_FILTER_DEPENDEND' OF STRUCTURE ls_sxs_attr TO <fv>.
      IF sy-subrc = 0 AND <fv> = 'X'.
        ls_result-filter_dependent = abap_true.
      ENDIF.

*     === Step 2: BAdI def -> interface (SXS_INTER.INTER_NAME) ===
      SELECT SINGLE inter_name FROM sxs_inter
        INTO lv_interface
        WHERE exit_name = lv_def_name.
      IF sy-subrc = 0.
        ls_result-interface = lv_interface.
      ENDIF.

*     === Step 3: impl names for this BAdI def (SXC_EXIT.EXIT_NAME) ===
*     SXC_EXIT links IMP_NAME <-> EXIT_NAME (one row per filter value).
*     DISTINCT collapses filter rows so each impl appears once.
      SELECT DISTINCT imp_name FROM sxc_exit
        INTO TABLE lt_impl_names
        WHERE exit_name = lv_def_name.

      LOOP AT lt_impl_names INTO lv_imp_name.

*       customer_only: keep only Z*/Y* impls
        IF iv_customer_only = abap_true.
          IF lv_imp_name NP 'Z*' AND lv_imp_name NP 'Y*'.
            CONTINUE.
          ENDIF.
        ENDIF.

*       active state from SXC_ATTR (active version row first; fall back to any)
        SELECT SINGLE active FROM sxc_attr
          INTO lv_active
          WHERE imp_name = lv_imp_name AND version = 'A'.

        IF sy-subrc <> 0.
          SELECT SINGLE active FROM sxc_attr
            INTO lv_active
            WHERE imp_name = lv_imp_name.
        ENDIF.

        IF iv_active_only = abap_true AND lv_active <> 'X'.
          CONTINUE.
        ENDIF.

        DATA(ls_impl) = VALUE ty_impl( impl_name = lv_imp_name ).
        IF lv_active = 'X'.
          ls_impl-active = abap_true.
        ENDIF.

*       === Step 4a: impl class via SXC_CLASS (joins on INTER_NAME, not EXIT_NAME) ===
        IF lv_interface IS NOT INITIAL.
          SELECT SINGLE imp_class FROM sxc_class
            INTO lv_class
            WHERE imp_name   = lv_imp_name
              AND inter_name = lv_interface.
          IF sy-subrc = 0.
            ls_impl-impl_class = lv_class.

*           === Step 4b: package via TADIR ===
            SELECT SINGLE devclass FROM tadir
              INTO lv_devclass
              WHERE pgmid = 'R3TR' AND object = 'CLAS'
                AND obj_name = lv_class.
            IF sy-subrc = 0.
              ls_impl-package = lv_devclass.
            ENDIF.
          ENDIF.
        ENDIF.

*       === Step 4c: implemented methods from SXC_IMPSWH ===
        IF iv_include_methods = abap_true AND lv_interface IS NOT INITIAL.
          REFRESH lt_methods.
          SELECT metho_name FROM sxc_impswh
            INTO TABLE lt_methods
            WHERE imp_name   = lv_imp_name
              AND inter_name = lv_interface.
          LOOP AT lt_methods INTO lv_method.
            APPEND CONV string( lv_method ) TO ls_impl-methods_redefined.
          ENDLOOP.
        ENDIF.

        APPEND ls_impl TO ls_result-implementations.
      ENDLOOP.

*     === Step 5: serialize ===
      ev_result = /ui2/cl_json=>serialize(
        data        = ls_result
        compress    = abap_true
        pretty_name = /ui2/cl_json=>pretty_mode-low_case ).

      ev_subrc   = 0.
      ev_message = |BAdI { lv_def_name }: { lines( ls_result-implementations ) } impl(s), kind={ ls_result-kind }|.

    CATCH cx_root INTO DATA(lx_root).
      ev_subrc   = 8.
      ev_message = lx_root->get_text( ).
  ENDTRY.

ENDFUNCTION.
